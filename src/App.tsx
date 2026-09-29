import { useEffect, useRef, useState } from 'react'
import { AudioManager } from './audio/audioManager'
import { BattleScreen } from './battle/BattleScreen'
import { builtInFighters } from './data/builtInFighters'
import { CustomFighterEditor } from './fighters/CustomFighterEditor'
import { deleteCustomFighter, loadCustomFighters, saveCustomFighter } from './fighters/storage'
import { addSelection, canSelect, displayColor } from './fighters/fighterUtils'
import { createMatch } from './game/engine'
import type { FighterDefinition, MatchState } from './game/types'

const groups = [{ id: 'browsers', name: 'Browsers' }, { id: 'countries', name: 'Countries' }, { id: 'clubs', name: 'Football clubs' }, { id: 'cars', name: 'Cars' }, { id: 'custom', name: 'Custom / friends' }]
export default function App() {
  const audio = useRef(new AudioManager()).current
  const [audioPreference, setAudioPreference] = useState(audio.preference)
  const [group, setGroup] = useState('browsers')
  const [selected, setSelected] = useState<FighterDefinition[]>([])
  const [custom, setCustom] = useState<FighterDefinition[]>([])
  const [editor, setEditor] = useState<FighterDefinition | 'new' | null>(null)
  const [storageError, setStorageError] = useState('')
  const [match, setMatch] = useState<MatchState | null>(null)
  useEffect(() => { loadCustomFighters().then(setCustom).catch(() => setStorageError('Local fighter storage is unavailable in this browser.')) }, [])
  useEffect(() => { document.body.classList.toggle('recording', !!match); return () => document.body.classList.remove('recording') }, [match])
  const groupFighters = group === 'custom' ? custom : builtInFighters.filter(f => f.group === group)
  const selectedIds = new Set(selected.map(f => f.id))
  function start(fighters = selected) {
    if (!canSelect(fighters)) return
    void audio.unlock()
    setMatch(createMatch(fighters))
  }
  function updateColor(id: string, color: string) { setSelected(previous => previous.map(f => f.id === id ? { ...f, overrideColor: color } : f)) }
  function resetColor(id: string) { setSelected(previous => previous.map(f => { if (f.id !== id) return f; const { overrideColor: _, ...rest } = f; void _; return rest })) }
  async function saveFighter(fighter: FighterDefinition) {
    await saveCustomFighter(fighter)
    setCustom(previous => [...previous.filter(f => f.id !== fighter.id), fighter])
    setSelected(previous => previous.map(f => f.id === fighter.id ? fighter : f))
  }
  async function removeFighter(fighter: FighterDefinition) {
    try { await deleteCustomFighter(fighter.id); setCustom(previous => previous.filter(f => f.id !== fighter.id)); setSelected(previous => previous.filter(f => f.id !== fighter.id)) }
    catch { setStorageError('Could not remove the saved fighter.') }
  }
  function changeAudio(next: { muted: boolean; volume: number }) { audio.setPreference(next); setAudioPreference(next) }
  if (match) return <BattleScreen key={match.fighters.map(f => f.id).join('-') + match.fighters[0].position.x} match={match} audio={audio} onRematch={() => start()} onNew={() => { setMatch(null); setSelected([]) }} onSetup={() => setMatch(null)} />
  return <main className="setup-page">
    <header className="site-header"><div className="brand"><span className="brand-symbol">LA</span><span>LINE <b>ARENA</b></span></div><span className="header-meta">LOCAL ARENA <i /> V1</span></header>
    <div className="setup-shell">
      <div className="hero"><div><span className="eyebrow">MATCH CONTROL / DEPLOYMENT</span><h1>STAGE THE <em>CLASH.</em></h1><p>Choose 2–6 fighters. Their lines decide the battle. Every winner earns the arena.</p></div><div className="hero-orbit" aria-hidden="true"><span /><span /><span /></div></div>
      <div className="setup-grid">
        <section className="roster-section" aria-labelledby="roster-title"><div className="section-heading"><div><span className="step-label">01 / ROSTER</span><h2 id="roster-title">Fighter collections</h2></div><span className="section-note">Choose up to six</span></div>
          <div className="group-tabs" role="tablist" aria-label="Fighter collections">{groups.map(item => <button key={item.id} type="button" role="tab" aria-selected={group === item.id} className={group === item.id ? 'active' : ''} onClick={() => setGroup(item.id)}>{item.name}</button>)}</div>
          <div className="fighter-grid">{groupFighters.map(fighter => <div className={`fighter-card ${selectedIds.has(fighter.id) ? 'selected' : ''}`} key={fighter.id} style={{ '--fighter-color': displayColor(fighter) } as React.CSSProperties}>
            <button type="button" className="fighter-pick" aria-pressed={selectedIds.has(fighter.id)} onClick={() => setSelected(previous => addSelection(previous, fighter))}><span className="fighter-avatar"><img src={fighter.imageSource} alt="" onError={e => { e.currentTarget.style.visibility = 'hidden' }} /></span><strong>{fighter.name}</strong><span className="selection-mark">{selectedIds.has(fighter.id) ? '✓' : '+'}</span></button>
            {fighter.sourceType === 'custom' && <div className="card-tools"><button onClick={() => setEditor(fighter)}>Edit</button><button onClick={() => void removeFighter(fighter)}>Delete</button></div>}
          </div>)}{group === 'custom' && <button className="add-fighter" onClick={() => setEditor('new')}><span>＋</span><strong>Add fighter</strong><small>Upload a portrait</small></button>}</div>
          {group === 'custom' && custom.length === 0 && <p className="empty-note">Your saved fighters appear here. Add a portrait to begin.</p>}
        </section>
        <aside className="lineup-panel" aria-labelledby="lineup-title"><div className="section-heading"><div><span className="step-label">02 / LINEUP</span><h2 id="lineup-title">Battle lineup</h2></div><strong className="lineup-number">{selected.length} / 6</strong></div>
          {selected.length === 0 && <div className="lineup-empty"><span>◎</span><p>Select fighters from a collection to build your battle.</p></div>}
          <ol className="lineup-list">{selected.map((fighter, index) => <li key={fighter.id} style={{ '--fighter-color': displayColor(fighter) } as React.CSSProperties}><span className="slot-number">{String(index + 1).padStart(2, '0')}</span><img src={fighter.imageSource} alt="" /><div className="lineup-name"><strong>{fighter.name}</strong><small>{fighter.sourceType === 'custom' ? 'Custom fighter' : fighter.group}</small></div><input type="color" aria-label={`Color for ${fighter.name}`} value={displayColor(fighter)} onChange={e => updateColor(fighter.id, e.target.value)} />{fighter.overrideColor && <button className="reset-color" title="Use automatic color" aria-label={`Reset ${fighter.name} color`} onClick={() => resetColor(fighter.id)}>↺</button>}<button className="remove-button" aria-label={`Remove ${fighter.name}`} onClick={() => setSelected(previous => previous.filter(f => f.id !== fighter.id))}>×</button></li>)}</ol>
          <p className="lineup-hint">Colors can be changed here before every match. The winner is decided by the lines.</p>
          <button className="primary-button start-button" disabled={!canSelect(selected)} onClick={() => start()}>START BATTLE <span>↗</span></button><p className="start-hint">{selected.length < 2 ? 'Select at least two fighters' : 'Ready for a portrait recording'}</p>
          <div className="audio-controls"><div><span>Sound</span><button aria-label={audioPreference.muted ? 'Unmute audio' : 'Mute audio'} onClick={() => changeAudio({ ...audioPreference, muted: !audioPreference.muted })}>{audioPreference.muted ? 'Muted' : 'On'}</button></div><label>Master volume<input type="range" min="0" max="1" step="0.05" value={audioPreference.volume} onChange={e => changeAudio({ ...audioPreference, volume: Number(e.target.value) })} /></label></div>
        </aside>
      </div>
      {storageError && <p role="alert" className="form-error">{storageError}</p>}
    </div>
    {editor && <CustomFighterEditor initial={editor === 'new' ? undefined : editor} onSave={saveFighter} onClose={() => setEditor(null)} />}
  </main>
}
