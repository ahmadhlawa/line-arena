import { anchorPoint } from './geometry'
import type { GameEvent, MatchState } from './types'

const W = 540, H = 960, CX = 270, CY = 505, R = 232
type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; debris: boolean }
type Shock = { x: number; y: number; life: number; maxLife: number; color: string; radius: number; wall?: boolean }
type Fragment = { ax: number; ay: number; bx: number; by: number; x: number; y: number; life: number; color: string }
type Trail = { x: number; y: number; life: number }
type Pop = { x: number; y: number; life: number; count: number; color: string; key: string; positive: boolean }
const portraits = new Map<string, HTMLImageElement | null>()

function portrait(source: string): HTMLImageElement | null {
  if (!source) return null
  if (!portraits.has(source)) {
    const image = new Image()
    image.onload = () => portraits.set(source, image)
    image.onerror = () => portraits.set(source, null)
    portraits.set(source, null)
    image.src = source
  }
  return portraits.get(source) ?? null
}

function paintBackdrop(ctx: CanvasRenderingContext2D, resolution: number): void {
  ctx.setTransform(resolution, 0, 0, resolution, 0, 0)
  const steel = ctx.createLinearGradient(0, 0, W, H)
  steel.addColorStop(0, '#151a1c'); steel.addColorStop(.52, '#0b1012'); steel.addColorStop(1, '#171b1a')
  ctx.fillStyle = steel; ctx.fillRect(0, 0, W, H)

  // Faint printed grid and scratches sit in the plate, behind gameplay.
  ctx.strokeStyle = 'rgba(210,215,203,.035)'; ctx.lineWidth = .5
  for (let x = 18; x < W; x += 46) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
  for (let y = 16; y < H; y += 46) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
  for (let i = 0; i < 42; i++) {
    const x = (i * 97.7) % W, y = (i * 181.3) % H
    ctx.strokeStyle = i % 3 ? 'rgba(220,215,195,.025)' : 'rgba(220,215,195,.045)'
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8 + (i % 5) * 9, y - 1); ctx.stroke()
  }

  ctx.save()
  ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.clip()
  const floor = ctx.createRadialGradient(CX, CY, 28, CX, CY, R)
  floor.addColorStop(0, '#1b2527'); floor.addColorStop(.7, '#141c1e'); floor.addColorStop(1, '#0d1416')
  ctx.fillStyle = floor; ctx.fillRect(CX - R, CY - R, R * 2, R * 2)
  ctx.strokeStyle = 'rgba(206,209,191,.055)'; ctx.lineWidth = 1
  for (let radius = 52; radius < R; radius += 52) {
    ctx.beginPath(); ctx.arc(CX, CY, radius, 0, Math.PI * 2); ctx.stroke()
  }
  ctx.beginPath(); ctx.moveTo(CX - R, CY); ctx.lineTo(CX + R, CY)
  ctx.moveTo(CX, CY - R); ctx.lineTo(CX, CY + R); ctx.stroke()
  ctx.strokeStyle = 'rgba(206,209,191,.025)'; ctx.lineWidth = .5
  for (let y = CY - R; y < CY + R; y += 7) {
    ctx.beginPath(); ctx.moveTo(CX - R, y); ctx.lineTo(CX + R, y); ctx.stroke()
  }
  ctx.restore()

  ctx.strokeStyle = '#293234'; ctx.lineWidth = 11
  ctx.beginPath(); ctx.arc(CX, CY, R + 3, 0, Math.PI * 2); ctx.stroke()
  ctx.strokeStyle = '#7c8986'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.arc(CX, CY, R + 3, 0, Math.PI * 2); ctx.stroke()
  ctx.strokeStyle = 'rgba(193,199,190,.24)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.arc(CX, CY, R - 4, 0, Math.PI * 2); ctx.stroke()
  for (let i = 0; i < 72; i++) {
    const angle = i * Math.PI * 2 / 72
    const inner = R + (i % 6 === 0 ? 11 : 8)
    const outer = R + 15
    ctx.strokeStyle = i % 6 === 0 ? '#9c7553' : '#465052'
    ctx.lineWidth = i % 6 === 0 ? 1.5 : 1
    ctx.beginPath()
    ctx.moveTo(CX + Math.cos(angle) * inner, CY + Math.sin(angle) * inner)
    ctx.lineTo(CX + Math.cos(angle) * outer, CY + Math.sin(angle) * outer)
    ctx.stroke()
  }
  ctx.fillStyle = '#686f6b'; ctx.font = '700 8px Arial, sans-serif'; ctx.textAlign = 'center'
  ctx.fillText('CONTAINMENT RING  /  ACTIVE', CX, CY - R - 25)
  ctx.fillText('LINE ARENA  //  FIELD 01', CX, CY + R + 32)
}

export class CanvasRenderer {
  private particles: Particle[] = []
  private shocks: Shock[] = []
  private fragments: Fragment[] = []
  private trails = new Map<string, Trail[]>()
  private pops: Pop[] = []
  private trailClock = 0
  private flash = 0
  private resolution = 1
  private backdrop: HTMLCanvasElement

  constructor(private canvas: HTMLCanvasElement) {
    this.backdrop = document.createElement('canvas')
    this.resize()
  }

  resize(): void {
    const width = this.canvas.getBoundingClientRect().width || W
    this.resolution = Math.max(.5,Math.min(2,width / W * (window.devicePixelRatio || 1)))
    this.canvas.width = Math.round(W*this.resolution); this.canvas.height = Math.round(H*this.resolution)
    this.backdrop.width = this.canvas.width; this.backdrop.height = this.canvas.height
    const ctx = this.backdrop.getContext('2d')
    if (ctx) paintBackdrop(ctx,this.resolution)
  }

  ingest(events: GameEvent[], match: MatchState): void {
    for (const event of events) {
      if (event.x === undefined || event.y === undefined) continue
      const owner = match.fighters.find(f => f.id === event.fighterId)
      const color = owner?.color ?? '#d5d0bf'
      const amount = event.type === 'eliminate' ? 32 : event.type === 'break' ? Math.min(15, 3 + (event.count ?? 1)) : event.type === 'impact' ? 9 : 5
      const x = CX + event.x * R, y = CY + event.y * R
      if (event.type === 'create' || event.type === 'break') {
        const key = `${event.type}:${event.fighterId}`
        const pop = this.pops.find(p => p.key === key && p.life > .48 && Math.hypot(p.x-x,p.y-y) < 42)
        if (pop) { pop.count += event.count ?? 1; pop.life = .65 }
        else this.pops.push({ x, y, life: .65, count: event.count ?? 1, color, key, positive: event.type === 'create' })
      }
      if (event.type === 'break' && owner) {
        for (const anchor of (event.anchors ?? []).filter((_,i,list) => i % Math.max(1,Math.ceil(list.length/4)) === 0)) {
          const point = anchorPoint(anchor)
          this.fragments.push({ ax: CX+point.x*R, ay: CY+point.y*R, bx: CX+owner.position.x*R, by: CY+owner.position.y*R, x, y, life: .22, color })
        }
      }
      if (event.type === 'eliminate') this.flash = .18
      // Creation is represented by the fan and its count; reserve sparks for impacts.
      if (event.type === 'create' || event.type === 'slow') continue
      for (let i = 0; i < amount; i++) {
        const angle = Math.random() * Math.PI * 2
        const force = 25 + Math.random() * (event.type === 'eliminate' ? 130 : 80)
        const life = .24 + Math.random() * .35
        this.particles.push({ x, y, vx: Math.cos(angle) * force, vy: Math.sin(angle) * force, life, maxLife: life, color, size: .7 + Math.random() * 1.8, debris: i % 4 === 0 })
      }
      if (['wall','break','impact','eliminate'].includes(event.type)) {
        const life = event.type === 'eliminate' ? .45 : .22
        this.shocks.push({ x, y, life, maxLife: life, color, radius: event.type === 'eliminate' ? 44 : 18, wall: event.type === 'wall' })
      }
    }
    if (this.particles.length > 180) this.particles.splice(0, this.particles.length - 180)
    if (this.shocks.length > 32) this.shocks.splice(0,this.shocks.length-32)
    if (this.fragments.length > 28) this.fragments.splice(0,this.fragments.length-28)
    if (this.pops.length > 8) this.pops.splice(0,this.pops.length-8)
  }

  draw(match: MatchState, realDt: number): void {
    const ctx = this.canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(this.resolution, 0, 0, this.resolution, 0, 0)
    ctx.clearRect(0, 0, W, H)
    ctx.drawImage(this.backdrop, 0, 0, W, H)
    const slow = match.phase === 'FINISH_SLOW_MOTION'
    const duel = slow || match.phase === 'FINAL_DUEL'
    const scale = slow ? .22 : 1
    this.trailClock += realDt * scale
    const sampleTrail = this.trailClock >= .035
    if (sampleTrail) this.trailClock = 0
    if (duel) {
      ctx.fillStyle = slow ? 'rgba(117,45,28,.10)' : 'rgba(117,45,28,.035)'
      ctx.fillRect(0, 0, W, H)
    }

    ctx.save()
    ctx.beginPath(); ctx.arc(CX, CY, R - 3, 0, Math.PI * 2); ctx.clip()
    for (const fighter of match.fighters) {
      const trail = this.trails.get(fighter.id) ?? []
      for (const point of trail) point.life -= realDt * scale
      while (trail.length && trail[0].life <= 0) trail.shift()
      if (sampleTrail && fighter.alive && !['PRE_BATTLE','COUNTDOWN','RESULTS','WINNER_REVEAL'].includes(match.phase)) trail.push({ x: CX+fighter.position.x*R, y: CY+fighter.position.y*R, life: .26 })
      this.trails.set(fighter.id,trail)
      ctx.strokeStyle = fighter.color; ctx.lineWidth = 3
      for (let i = 1; i < trail.length; i++) {
        ctx.globalAlpha = trail[i-1].life / .26 * .28
        ctx.beginPath(); ctx.moveTo(trail[i-1].x,trail[i-1].y); ctx.lineTo(trail[i].x,trail[i].y); ctx.stroke()
      }
    }
    for (const fighter of match.fighters) {
      if (!fighter.alive) continue
      ctx.strokeStyle = fighter.color
      ctx.lineWidth = fighter.lines.size <= 7 ? 1.65 : slow ? 1.15 : .9
      ctx.globalAlpha = slow ? .88 : fighter.lines.size > 70 ? .40 : .62
      ctx.beginPath()
      const x = CX + fighter.position.x * R, y = CY + fighter.position.y * R
      for (const anchor of fighter.lines) {
        const point = anchorPoint(anchor)
        ctx.moveTo(CX + point.x * R, CY + point.y * R); ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    for (const fragment of this.fragments) {
      fragment.life -= realDt * scale
      const fade = Math.max(0,fragment.life/.22)
      ctx.globalAlpha = fade * .75; ctx.strokeStyle = fragment.color; ctx.lineWidth = 1.3
      // Two severed ends retract from the actual crossing, then disappear.
      ctx.beginPath(); ctx.moveTo(fragment.ax,fragment.ay)
      ctx.lineTo(fragment.ax+(fragment.x-fragment.ax)*fade,fragment.ay+(fragment.y-fragment.ay)*fade)
      ctx.moveTo(fragment.bx,fragment.by)
      ctx.lineTo(fragment.bx+(fragment.x-fragment.bx)*fade,fragment.by+(fragment.y-fragment.by)*fade); ctx.stroke()
    }
    this.fragments = this.fragments.filter(f => f.life > 0)
    ctx.globalAlpha = 1
    if (slow && match.pendingFinish) {
      const { contact, ownerId } = match.pendingFinish
      const color = match.fighters.find(f => f.id === ownerId)?.color ?? '#e9ddc8'
      const x = CX+contact.x*R, y = CY+contact.y*R
      ctx.strokeStyle = color; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(x,y,10+3*Math.sin(match.phaseElapsed*12),0,Math.PI*2); ctx.stroke()
      ctx.fillStyle = '#fff4dd'; ctx.beginPath(); ctx.arc(x,y,2,0,Math.PI*2); ctx.fill()
    }

    for (const fighter of match.fighters) {
      if (!fighter.alive) continue
      const x = CX + fighter.position.x * R, y = CY + fighter.position.y * R, radius = fighter.radius * R
      const heading = Math.atan2(fighter.velocity.y, fighter.velocity.x)
      ctx.save()
      ctx.translate(x, y); ctx.rotate(heading)
      ctx.fillStyle = fighter.color
      ctx.beginPath(); ctx.moveTo(radius + 8, 0); ctx.lineTo(radius + 2, -3.5); ctx.lineTo(radius + 2, 3.5); ctx.closePath(); ctx.fill()
      ctx.restore()
      ctx.save(); ctx.shadowColor = fighter.color; ctx.shadowBlur = 9
      ctx.fillStyle = fighter.color; ctx.beginPath(); ctx.arc(x, y, radius + 3, 0, Math.PI * 2); ctx.fill(); ctx.restore()
      ctx.fillStyle = '#181d1e'; ctx.beginPath(); ctx.arc(x, y, radius + 1, 0, Math.PI * 2); ctx.fill()
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, radius - 1, 0, Math.PI * 2); ctx.clip()
      ctx.fillStyle = '#273034'; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
      const image = portrait(fighter.imageSource)
      if (image) ctx.drawImage(image, x - radius, y - radius, radius * 2, radius * 2)
      else {
        ctx.fillStyle = '#f3f0e6'; ctx.font = `700 ${Math.round(radius)}px Arial, sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(fighter.name[0]?.toUpperCase() ?? '?', x, y)
      }
      ctx.restore()
      ctx.strokeStyle = 'rgba(245,243,229,.8)'; ctx.lineWidth = .8
      ctx.beginPath(); ctx.arc(x, y, radius - 1, 0, Math.PI * 2); ctx.stroke()
    }

    for (const p of this.particles) {
      p.x += p.vx * realDt * scale; p.y += p.vy * realDt * scale; p.life -= realDt * scale
      if (p.life <= 0) continue
      ctx.globalAlpha = p.life / p.maxLife * (p.debris ? .6 : .95)
      ctx.strokeStyle = p.debris ? '#b6afa0' : p.color; ctx.lineWidth = p.size
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x-p.vx*.018,p.y-p.vy*.018); ctx.stroke()
    }
    ctx.globalAlpha = 1
    this.particles = this.particles.filter(p => p.life > 0)
    for (const shock of this.shocks) {
      shock.life -= realDt * scale
      if (shock.life <= 0) continue
      const progress = 1 - shock.life / shock.maxLife
      ctx.globalAlpha = (1 - progress) * .8
      ctx.strokeStyle = shock.color; ctx.lineWidth = 1.4
      ctx.beginPath()
      if (shock.wall) {
        const angle = Math.atan2(shock.y-CY,shock.x-CX)
        ctx.lineWidth = 3*(1-progress)+1
        ctx.arc(CX,CY,R-4,angle-.06-progress*.12,angle+.06+progress*.12)
      } else ctx.arc(shock.x, shock.y, 3 + shock.radius * progress, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    this.shocks = this.shocks.filter(shock => shock.life > 0)
    ctx.restore()
    for (const pop of this.pops) {
      pop.life -= realDt * scale
      if (pop.life <= 0 || pop.count < 3) continue
      ctx.globalAlpha = Math.min(1,pop.life/.18)
      ctx.font = 'bold 12px Bahnschrift, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      const x = Math.max(56,Math.min(W-56,pop.x)), y = pop.y-24-(.65-pop.life)*18
      ctx.lineWidth = 3; ctx.strokeStyle = '#101719'; ctx.strokeText(`${pop.positive ? '+' : '−'}${pop.count}`,x,y)
      ctx.fillStyle = pop.color; ctx.fillText(`${pop.positive ? '+' : '−'}${pop.count}`,x,y)
    }
    this.pops = this.pops.filter(p => p.life > 0)
    ctx.globalAlpha = 1
    if (this.flash > 0) {
      this.flash -= realDt
      ctx.fillStyle = `rgba(242,220,176,${Math.max(0,this.flash)*.24})`; ctx.fillRect(0,0,W,H)
    }

    if (duel) {
      ctx.strokeStyle = slow ? '#c66b43' : `rgba(190,99,62,${.4+.12*Math.sin(match.elapsed*4)})`
      ctx.lineWidth = slow ? 2.2 : 1.2
      ctx.beginPath(); ctx.arc(CX, CY, R + 4, -.37, .37); ctx.stroke()
      ctx.beginPath(); ctx.arc(CX, CY, R + 4, Math.PI - .37, Math.PI + .37); ctx.stroke()
      if (slow) {
        ctx.fillStyle = 'rgba(199,93,51,.14)'
        ctx.fillRect(0, 0, W, 4); ctx.fillRect(0, H - 4, W, 4)
      }
    }
  }
}
