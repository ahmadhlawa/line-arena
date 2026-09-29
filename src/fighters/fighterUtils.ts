import type { FighterDefinition } from '../game/types'

export const displayColor = (fighter: FighterDefinition) => fighter.overrideColor ?? fighter.autoColor
export const canSelect = (fighters: FighterDefinition[]) => fighters.length >= 2 && fighters.length <= 6
export function addSelection(selected: FighterDefinition[], fighter: FighterDefinition): FighterDefinition[] {
  return selected.some(item => item.id === fighter.id) ? selected.filter(item => item.id !== fighter.id) :
    selected.length < 6 ? [...selected, fighter] : selected
}
export function enhanceColor([r, g, b]: [number, number, number]): string {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min
  let h = 0
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6
    else if (max === g) h = (b - r) / delta + 2
    else h = (r - g) / delta + 4
  }
  h = ((h * 60 + 360) % 360) / 360
  // Gray images get a dependable cyan accent; otherwise preserve their hue.
  if (delta < 0.08) h = 0.52
  const s = Math.max(0.72, delta / (1 - Math.abs(max + min - 1) || 1))
  const l = Math.min(0.7, Math.max(0.57, (max + min) / 2))
  const a = s * Math.min(l, 1 - l)
  const channel = (n: number) => {
    const k = (n + h * 12) % 12
    return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255).toString(16).padStart(2, '0')
  }
  return `#${channel(0)}${channel(8)}${channel(4)}`
}
export function detectCanvasColor(canvas: HTMLCanvasElement): string {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return '#4de0f7'
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data
  let r = 0, g = 0, b = 0, total = 0
  for (let i = 0; i < data.length; i += 16) {
    const alpha = data[i + 3] / 255
    if (alpha < 0.5) continue
    const max = Math.max(data[i], data[i + 1], data[i + 2])
    const min = Math.min(data[i], data[i + 1], data[i + 2])
    const weight = alpha * (0.25 + (max - min) / 255)
    r += data[i] * weight; g += data[i + 1] * weight; b += data[i + 2] * weight; total += weight
  }
  return total ? enhanceColor([r / total, g / total, b / total]) : '#4de0f7'
}
