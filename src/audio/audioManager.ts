import type { GameEvent } from '../game/types'

type Preference = { muted: boolean; volume: number }
const KEY = 'line-arena-audio'
export class AudioManager {
  preference: Preference = { muted: false, volume: 0.45 }
  private context?: AudioContext
  private last = new Map<string, number>()
  private batches = new Map<string, { event: GameEvent; due: number }>()
  private noiseBuffer?: AudioBuffer
  constructor() {
    try { this.preference = { ...this.preference, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { /* storage unavailable */ }
  }
  setPreference(next: Preference): void {
    this.preference = next
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* storage unavailable */ }
  }
  async unlock(): Promise<void> {
    if (this.preference.muted) return
    try { this.context ??= new AudioContext(); await this.context.resume() } catch { /* browser blocked audio */ }
  }
  private tone(frequency: number, duration: number, type: OscillatorType = 'sine', amount = 1, end = frequency * .65): void {
    if (this.preference.muted || !this.preference.volume) return
    try {
      this.context ??= new AudioContext()
      if (this.context.state === 'suspended') void this.context.resume()
      const oscillator = this.context.createOscillator(), gain = this.context.createGain()
      const now = this.context.currentTime
      oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, now)
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(60, end), now + duration)
      gain.gain.setValueAtTime(Math.max(.0001, this.preference.volume * amount * .15), now)
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration)
      oscillator.connect(gain).connect(this.context.destination)
      oscillator.start(now); oscillator.stop(now + duration)
    } catch { /* browser blocked audio */ }
  }
  private spark(amount: number): void {
    if (this.preference.muted || !this.preference.volume || !this.context) return
    try {
      const ctx = this.context
      if (!this.noiseBuffer) {
        this.noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .12), ctx.sampleRate)
        const samples = this.noiseBuffer.getChannelData(0)
        for (let i=0;i<samples.length;i++) samples[i] = Math.random()*2-1
      }
      const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain()
      source.buffer = this.noiseBuffer; filter.type = 'highpass'; filter.frequency.value = 1600
      gain.gain.setValueAtTime(this.preference.volume*amount*.10,ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.12)
      source.connect(filter).connect(gain).connect(ctx.destination); source.start(); source.stop(ctx.currentTime+.12)
    } catch { /* browser blocked audio */ }
  }
  flush(): void {
    const now = performance.now()
    for (const [key,batch] of this.batches) if (batch.due <= now) {
      this.batches.delete(key); this.sound(batch.event)
    }
  }
  play(event: GameEvent): void {
    if (event.type === 'break' || event.type === 'create') {
      const key = `${event.type}:${event.fighterId}`
      const batch = this.batches.get(key)
      if (batch) batch.event.count = (batch.event.count ?? 0) + (event.count ?? 1)
      else this.batches.set(key,{ event: { ...event }, due: performance.now()+70 })
      return
    }
    this.sound(event)
  }
  private sound(event: GameEvent): void {
    const now = performance.now(), last = this.last.get(event.type) ?? -Infinity
    if (now - last < (event.type === 'wall' || event.type === 'break' ? 90 : 35)) return
    this.last.set(event.type, now)
    switch (event.type) {
      case 'tick': this.tone(280, .09, 'square', .3); break
      case 'fight': this.tone(155, .38, 'sawtooth', .75); this.tone(520, .12, 'triangle', .4); break
      case 'wall': this.tone(185, .075, 'triangle', .5); this.tone(840,.035,'square',.15); this.spark(.3); break
      case 'create': this.tone(420+Math.min(event.count ?? 1,26)*8, .085, 'triangle', .24); break
      case 'break': this.tone(240-Math.min(event.count ?? 1,24)*5, .10, 'sawtooth', .3); this.spark(Math.min(.8,.25+(event.count ?? 1)*.025)); break
      case 'impact': this.tone(95, .10, 'triangle', .6); this.spark(.5); break
      case 'eliminate': this.tone(125, .43, 'sawtooth', .7); this.tone(75, .52, 'sine', .45); this.spark(1); break
      case 'duel': this.tone(110,.4,'triangle',.45); this.tone(220,.4,'sine',.25); break
      case 'slow': this.tone(78, .85, 'sine', .65,150); this.tone(310, .11, 'square', .24); break
      case 'victory': this.tone(280, .62, 'triangle', .65); this.tone(610, .6, 'sine', .55); break
    }
  }
}
