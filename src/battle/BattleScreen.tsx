import { useEffect, useRef, useState } from 'react'
import { CanvasRenderer } from '../game/renderer'
import { rankFighters, stepMatch } from '../game/engine'
import type { MatchState, GameEvent } from '../game/types'
import { AudioManager } from '../audio/audioManager'

type Props = { match: MatchState; audio: AudioManager; onRematch: () => void; onNew: () => void; onSetup: () => void }
type Snapshot = { phase: MatchState['phase']; phaseElapsed: number; fighters: { id: string; name: string; color: string; imageSource: string; count: number; alive: boolean }[]; winnerId?: string; event?: string; eventColor?: string }
function snapshot(match: MatchState, event = '', eventColor = ''): Snapshot {
  return { phase: match.phase, phaseElapsed: match.phaseElapsed, fighters: match.fighters.map(f => ({ id: f.id, name: f.name, color: f.color, imageSource: f.imageSource, count: f.lines.size, alive: f.alive })), winnerId: match.winnerId, event, eventColor }
}
function eventText(match: MatchState, event: GameEvent): string {
  const name = match.fighters.find(f => f.id === event.fighterId)?.name.toUpperCase() ?? ''
  if (event.type === 'eliminate') return `${name} ELIMINATED`
  return ''
}
export function BattleScreen({ match, audio, onRematch, onNew, onSetup }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [view, setView] = useState(() => snapshot(match))
  useEffect(() => {
    const node = canvas.current
    if (!node) return
    const renderer = new CanvasRenderer(node)
    const resize = () => { renderer.resize(); renderer.draw(match,0) }
    window.addEventListener('resize',resize)
    let frame = 0, previous = performance.now(), accumulator = 0, hudAt = 0, event = '', eventColor = '', eventUntil = 0
    let drawnPhase: MatchState['phase'] | undefined
    const tick = (now: number) => {
      const delta = Math.min(.1, (now - previous) / 1000); previous = now; accumulator += delta
      let steps = 0
      while (accumulator >= 1 / 120 && steps++ < 12) {
        stepMatch(match, 1 / 120)
        if (match.events.length) {
          renderer.ingest(match.events, match)
          for (const item of match.events) {
            audio.play(item)
            const label = eventText(match, item)
            if (label) { event = label; eventColor = match.fighters.find(f => f.id === item.fighterId)?.color ?? '#d7d2c1'; eventUntil = now + 1000 }
          }
        }
        accumulator -= 1 / 120
      }
      if (drawnPhase !== match.phase || !['PRE_BATTLE','COUNTDOWN','RESULTS'].includes(match.phase)) renderer.draw(match, delta)
      drawnPhase = match.phase
      audio.flush()
      if (now - hudAt > 90 || match.phase === 'RESULTS') { setView(snapshot(match, now < eventUntil ? event : '', eventColor)); hudAt = now }
      if (match.phase !== 'RESULTS') frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize',resize) }
  }, [match, audio])
  useEffect(() => {
    const leave = (event: KeyboardEvent) => { if (event.key === 'Escape') onSetup() }
    window.addEventListener('keydown', leave)
    return () => window.removeEventListener('keydown', leave)
  }, [onSetup])
  const winner = view.fighters.find(f => f.id === view.winnerId)
  const ranking = rankFighters(match)
  const countdown = view.phase === 'COUNTDOWN' ? (view.phaseElapsed < 1 ? 'READY?' : view.phaseElapsed < 4 ? String(4 - Math.floor(view.phaseElapsed)) : 'FIGHT!') : ''
  return <main className="battle-page">
    <div className={`recording-stage ${view.phase === 'FINAL_DUEL' || view.phase === 'FINISH_SLOW_MOTION' ? 'duel-stage' : ''} ${view.phase === 'FINISH_SLOW_MOTION' ? 'slow-stage' : ''}`}>
      <canvas ref={canvas} className="battle-canvas" aria-label="Line Arena battle simulation" />
      <div className="stage-header"><span className="stage-mark">LINE<span>ARENA</span></span><span className="stage-live"><i /> {view.phase === 'FINISH_SLOW_MOTION' ? 'FINAL MOMENT' : view.phase === 'FINAL_DUEL' ? 'FINAL DUEL' : 'BATTLE LIVE'}</span></div>
      <div className="battle-hud" aria-live="off">{view.fighters.map(f => <div className={`hud-row ${f.alive ? f.count <= 7 ? 'hud-critical' : '' : 'hud-out'}`} key={f.id} style={{ '--fighter-color': f.color } as React.CSSProperties}><img src={f.imageSource} alt="" onError={e => { e.currentTarget.style.visibility = 'hidden' }} /><span className="hud-name">{f.name}</span><span className="hud-count" key={f.count}>{f.alive ? f.count : 'OUT'}</span></div>)}</div>
      {view.phase === 'PRE_BATTLE' && <div className="stage-overlay intro"><span className="eyebrow">COMBATANTS LOCKED IN</span><h1>{view.fighters.map(f => f.name).join(' · ')}</h1><span className="intro-versus">VS</span></div>}
      {view.phase === 'COUNTDOWN' && <div className="stage-overlay countdown" key={countdown}><span>{countdown}</span></div>}
      {view.phase === 'FINAL_DUEL' && <div className="duel-banner">FINAL DUEL <span>·</span> TWO REMAIN</div>}
      {view.phase === 'FINISH_SLOW_MOTION' && <div className="slow-banner">FINAL BREAK</div>}
      {view.event && !['WINNER_REVEAL','RESULTS'].includes(view.phase) && <div className="event-banner" key={view.event} style={{ '--event-color': view.eventColor } as React.CSSProperties}>{view.event}</div>}
      {(view.phase === 'WINNER_REVEAL' || view.phase === 'RESULTS') && winner && <div className="winner-overlay" style={{ '--winner-color': winner.color } as React.CSSProperties}><div className="winner-rays" /><span className="eyebrow">LAST FIGHTER STANDING</span><img src={winner.imageSource} alt="" /><h1>{winner.name}</h1><strong>WINS!</strong></div>}
      {view.phase === 'RESULTS' && <div className="results-panel"><h2>FINAL RANKING</h2><ol>{ranking.map((fighter, index) => <li key={fighter.id}><span>{String(index + 1).padStart(2, '0')}</span><b style={{ color: fighter.color }}>{fighter.name}</b><small>{index === 0 ? 'WINNER' : 'ELIMINATED'}</small></li>)}</ol><div className="results-actions"><button className="primary-button" onClick={onRematch}>Rematch</button><button onClick={onNew}>New battle</button><button onClick={onSetup}>Back to setup</button></div></div>}
    </div>
  </main>
}
