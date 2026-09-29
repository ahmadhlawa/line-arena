import { useEffect, useRef, useState } from 'react'
import type { FighterDefinition } from '../game/types'
import { detectCanvasColor } from './fighterUtils'

type Props = { initial?: FighterDefinition; onSave: (fighter: FighterDefinition) => Promise<void>; onClose: () => void }
export function CustomFighterEditor({ initial, onSave, onClose }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [name, setName] = useState(initial?.name ?? '')
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [override, setOverride] = useState(initial?.overrideColor ?? '')
  const [autoColor, setAutoColor] = useState(initial?.autoColor ?? '#4de0f7')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const drag = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!initial?.imageSource) return
    const loaded = new Image()
    loaded.onload = () => setImage(loaded)
    loaded.onerror = () => setError('Saved image could not be opened. Upload a new one.')
    loaded.src = initial.imageSource
  }, [initial])
  useEffect(() => {
    const target = canvas.current, ctx = target?.getContext('2d')
    if (!target || !ctx) return
    const size = 256
    ctx.clearRect(0, 0, size, size)
    ctx.save(); ctx.beginPath(); ctx.arc(128, 128, 126, 0, Math.PI * 2); ctx.clip()
    ctx.fillStyle = '#15243b'; ctx.fillRect(0, 0, size, size)
    if (image) {
      const base = Math.max(size / image.width, size / image.height) * zoom
      const w = image.width * base, h = image.height * base
      ctx.drawImage(image, (size - w) / 2 + offset.x, (size - h) / 2 + offset.y, w, h)
    }
    ctx.restore()
    if (image) setAutoColor(detectCanvasColor(target))
  }, [image, zoom, offset])

  async function chooseFile(file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Choose an image file.'); return }
    if (file.size > 15_000_000) { setError('Choose an image under 15 MB.'); return }
    const url = URL.createObjectURL(file)
    const loaded = new Image()
    loaded.onload = () => { setImage(loaded); setZoom(1); setOffset({ x: 0, y: 0 }); setError(''); URL.revokeObjectURL(url) }
    loaded.onerror = () => { setError('This image could not be opened.'); URL.revokeObjectURL(url) }
    loaded.src = url
  }
  async function save() {
    if (!name.trim()) { setError('Enter a fighter name.'); return }
    if (!image || !canvas.current) { setError('Upload a fighter image.'); return }
    setSaving(true); setError('')
    try {
      await onSave({ id: initial?.id ?? crypto.randomUUID(), name: name.trim().slice(0, 24), imageSource: canvas.current.toDataURL('image/png'), sourceType: 'custom', group: 'custom', autoColor, ...(override ? { overrideColor: override } : {}) })
      onClose()
    } catch { setError('Could not save to this browser. Check storage permissions or free space.') }
    finally { setSaving(false) }
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="editor" role="dialog" aria-modal="true" aria-labelledby="editor-title">
      <div className="editor-head"><div><span className="eyebrow">COMBATANT FILE / CUSTOM</span><h2 id="editor-title">{initial ? 'Edit fighter' : 'Create fighter'}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close editor">×</button></div>
      <div className="editor-grid">
        <div className="crop-area">
          <canvas ref={canvas} width={256} height={256} className="crop-preview" aria-label="Circular fighter portrait preview" onPointerDown={e => { drag.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId) }} onPointerMove={e => { if (!drag.current) return; setOffset(p => ({ x: p.x + e.clientX - drag.current!.x, y: p.y + e.clientY - drag.current!.y })); drag.current = { x: e.clientX, y: e.clientY } }} onPointerUp={() => { drag.current = null }} />
          <p>Drag the portrait to position it</p>
          <label className="upload-button">Choose image<input type="file" accept="image/*" onChange={e => void chooseFile(e.target.files?.[0])} /></label>
        </div>
        <div className="editor-fields">
          <label>Fighter name<input type="text" maxLength={24} value={name} onChange={e => setName(e.target.value)} placeholder="Enter a name" /></label>
          <label>Zoom <span>{zoom.toFixed(1)}×</span><input type="range" min="1" max="3" step="0.05" value={zoom} onChange={e => setZoom(Number(e.target.value))} /></label>
          <div className="color-field"><span>Detected fighter color</span><span className="color-sample" style={{ backgroundColor: autoColor }} /> <strong>{autoColor}</strong></div>
          <label>Manual color override <input type="color" value={override || autoColor} onChange={e => setOverride(e.target.value)} /></label>
          {override && <button className="text-button" type="button" onClick={() => setOverride('')}>Use detected color</button>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" type="button" disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save fighter'}</button>
        </div>
      </div>
    </section>
  </div>
}
