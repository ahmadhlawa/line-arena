import type { Vec2 } from './types'

export const ANCHOR_COUNT = 240
export const TAU = Math.PI * 2
const anchors = Array.from({ length: ANCHOR_COUNT }, (_,index) => {
  const angle = index * TAU / ANCHOR_COUNT
  return Object.freeze({ x: Math.cos(angle), y: Math.sin(angle) })
})
export function anchorPoint(index: number): Vec2 {
  return anchors[(index % ANCHOR_COUNT + ANCHOR_COUNT) % ANCHOR_COUNT]
}
export function closestAnchor(point: Vec2): number {
  return (Math.round(Math.atan2(point.y, point.x) / TAU * ANCHOR_COUNT) + ANCHOR_COUNT) % ANCHOR_COUNT
}
export function distanceSquared(a: Vec2, b: Vec2): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2
}
function segmentIntersection(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  if (Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) > Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) ||
      Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) > Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y))) return false
  const cross = (p: Vec2, q: Vec2, r: Vec2) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
  const x = cross(a, b, c), y = cross(a, b, d), z = cross(c, d, a), w = cross(c, d, b)
  return x * y <= 0 && z * w <= 0
}
function pointSegmentDistanceSquared(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x, dy = b.y - a.y
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)))
  return distanceSquared(p, { x: a.x + t * dx, y: a.y + t * dy })
}
export function sweptCircleHitsLine(from: Vec2, to: Vec2, radius: number, a: Vec2, b: Vec2): boolean {
  if (segmentIntersection(from, to, a, b)) return true
  const limit = radius * radius
  return pointSegmentDistanceSquared(from, a, b) <= limit || pointSegmentDistanceSquared(to, a, b) <= limit ||
    pointSegmentDistanceSquared(a, from, to) <= limit || pointSegmentDistanceSquared(b, from, to) <= limit
}
