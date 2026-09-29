import { ANCHOR_COUNT, anchorPoint, closestAnchor, sweptCircleHitsLine } from './geometry'
import type { FighterDefinition, FighterRuntime, MatchState, Vec2 } from './types'
export { sweptCircleHitsLine } from './geometry'

const MAX_CONTACT_ARC = 26
const BASE_SPEED = 0.38
const FINISH_SECONDS = 0.85
const length = (x: number, y: number) => Math.hypot(x, y)
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

export function createMatch(definitions: FighterDefinition[], random: () => number = Math.random): MatchState {
  if (definitions.length < 2 || definitions.length > 6) throw new Error('Select 2–6 fighters')
  const fighters = definitions.map((definition, index) => {
    const sector = index * ANCHOR_COUNT / definitions.length
    // Fill each equal starting sector, leaving small neutral gaps.
    const startLines = Math.floor(ANCHOR_COUNT / definitions.length) - 6
    const centerAngle = sector * Math.PI * 2 / ANCHOR_COUNT
    const radial = 0.72 + (random() - 0.5) * 0.08
    const angle = centerAngle + (random() - 0.5) * 0.16
    const turn = random()
    const direction = centerAngle + (turn < .5 ? -1 : 1) * (1 + Math.abs(turn - .5) * .7)
    const speed = BASE_SPEED * (0.9 + random() * 0.2)
    const lines = new Set<number>()
    for (let j = -Math.floor(startLines / 2); j <= Math.floor(startLines / 2); j++) {
      lines.add((Math.round(sector + j) + ANCHOR_COUNT) % ANCHOR_COUNT)
    }
    const position = { x: Math.cos(angle) * radial, y: Math.sin(angle) * radial }
    return {
      id: definition.id, definitionId: definition.id, name: definition.name, imageSource: definition.imageSource,
      color: definition.overrideColor ?? definition.autoColor, position, previousPosition: { ...position },
      velocity: { x: Math.cos(direction) * speed, y: Math.sin(direction) * speed }, radius: 0.064,
      lines, alive: true,
    } satisfies FighterRuntime
  })
  return { fighters, phase: 'PRE_BATTLE', elapsed: 0, phaseElapsed: 0, events: [], eliminationCount: 0 }
}

export function recordWallContact(match: MatchState, fighter: FighterRuntime, anchor: number): number {
  if (!fighter.alive) return 0
  const normalized = ((anchor % ANCHOR_COUNT) + ANCHOR_COUNT) % ANCHOR_COUNT
  let delta = fighter.lastWallContact === undefined ? 0 : (normalized - fighter.lastWallContact + ANCHOR_COUNT) % ANCHOR_COUNT
  if (delta > ANCHOR_COUNT / 2) delta -= ANCHOR_COUNT
  const nearby = fighter.lastWallContact !== undefined && Math.abs(delta) <= MAX_CONTACT_ARC
  const start = nearby ? fighter.lastWallContact! : normalized - 3
  const direction = delta >= 0 ? 1 : -1
  let added = 0
  for (let i = 0; i <= (nearby ? Math.abs(delta) : 6); i++) {
    const current = (start + i * (nearby ? direction : 1) + ANCHOR_COUNT) % ANCHOR_COUNT
    if (!fighter.lines.has(current)) { fighter.lines.add(current); added++ }
  }
  fighter.lastWallContact = normalized
  if (added) match.events.push({ type: 'create', fighterId: fighter.id, count: added, ...anchorPoint(normalized) })
  return added
}

function wallBounce(match: MatchState, fighter: FighterRuntime, random: () => number): void {
  const max = 1 - fighter.radius
  const d = length(fighter.position.x, fighter.position.y)
  if (d < max) return
  const nx = fighter.position.x / d, ny = fighter.position.y / d
  fighter.position.x = nx * max; fighter.position.y = ny * max
  const dot = fighter.velocity.x * nx + fighter.velocity.y * ny
  if (dot > 0) {
    fighter.velocity.x -= 2 * dot * nx
    fighter.velocity.y -= 2 * dot * ny
    const perturb = (random() - 0.5) * 0.42
    const vx = fighter.velocity.x, vy = fighter.velocity.y
    fighter.velocity.x = vx * Math.cos(perturb) - vy * Math.sin(perturb)
    fighter.velocity.y = vx * Math.sin(perturb) + vy * Math.cos(perturb)
    const magnitude = length(vx,vy)
    if (-(fighter.velocity.x*nx + fighter.velocity.y*ny) < magnitude * .28) {
      const tangent = Math.sign(-ny*fighter.velocity.x + nx*fighter.velocity.y) || 1
      fighter.velocity.x = magnitude * (-nx*.28 - ny*tangent*Math.sqrt(1-.28**2))
      fighter.velocity.y = magnitude * (-ny*.28 + nx*tangent*Math.sqrt(1-.28**2))
    }
    match.events.push({ type: 'wall', fighterId: fighter.id, x: nx, y: ny })
    recordWallContact(match, fighter, closestAnchor(fighter.position))
  }
}

export function resolveBodyCollision(a: FighterRuntime, b: FighterRuntime): boolean {
  const dx = b.position.x - a.position.x, dy = b.position.y - a.position.y
  const distance = length(dx, dy)
  const overlap = a.radius + b.radius - distance
  if (overlap <= 0) return false
  const nx = distance ? dx / distance : 1, ny = distance ? dy / distance : 0
  a.position.x -= nx * overlap / 2; a.position.y -= ny * overlap / 2
  b.position.x += nx * overlap / 2; b.position.y += ny * overlap / 2
  const relative = (a.velocity.x - b.velocity.x) * nx + (a.velocity.y - b.velocity.y) * ny
  if (relative > 0) {
    a.velocity.x -= relative * nx; a.velocity.y -= relative * ny
    b.velocity.x += relative * nx; b.velocity.y += relative * ny
    // Keep a glancing exchange from leaving a fighter almost stationary.
    for (const [fighter, sign] of [[a, -1], [b, 1]] as const) {
      const magnitude = length(fighter.velocity.x, fighter.velocity.y)
      if (magnitude < 0.00001) fighter.velocity = { x: nx * sign * .32, y: ny * sign * .32 }
      else {
        const factor = clamp(magnitude, .32, .46) / magnitude
        fighter.velocity.x *= factor; fighter.velocity.y *= factor
      }
    }
  }
  return relative > 0
}

function eliminate(match: MatchState, fighter: FighterRuntime): void {
  if (!fighter.alive || fighter.lines.size) return
  fighter.alive = false
  fighter.eliminationOrder = ++match.eliminationCount
  match.events.push({ type: 'eliminate', fighterId: fighter.id, x: fighter.position.x, y: fighter.position.y })
  const survivors = match.fighters.filter(f => f.alive)
  if (survivors.length === 1) {
    match.winnerId = survivors[0].id
    match.phase = 'WINNER_REVEAL'; match.phaseElapsed = 0
    match.events.push({ type: 'victory', fighterId: survivors[0].id })
  } else if (survivors.length === 2) {
    match.phase = 'FINAL_DUEL'; match.phaseElapsed = 0
    match.events.push({ type: 'duel' })
  }
}

function breakLines(match: MatchState, owner: FighterRuntime, anchors: number[], contact: Vec2): void {
  let count = 0
  for (const anchor of anchors) if (owner.lines.delete(anchor)) count++
  if (count) match.events.push({ type: 'break', fighterId: owner.id, count, anchors, ...contact })
  if (owner.lines.size === 0) eliminate(match, owner)
}

function detectLineHits(match: MatchState): void {
  for (const attacker of match.fighters) {
    if (!attacker.alive) continue
    for (const owner of match.fighters) {
      if (!owner.alive || owner.id === attacker.id) continue
      const hits: number[] = []
      for (const anchor of owner.lines) {
        if (sweptCircleHitsLine(attacker.previousPosition, attacker.position, attacker.radius, anchorPoint(anchor), owner.position)) hits.push(anchor)
      }
      if (!hits.length) continue
      const anchor = anchorPoint(hits[0])
      const dx = owner.position.x - anchor.x, dy = owner.position.y - anchor.y
      const t = clamp(((attacker.position.x - anchor.x) * dx + (attacker.position.y - anchor.y) * dy) / (dx * dx + dy * dy || 1), 0, 1)
      const contact = { x: anchor.x + dx * t, y: anchor.y + dy * t }
      if (match.fighters.filter(f => f.alive).length === 2 && hits.length === owner.lines.size && !match.pendingFinish) {
        match.pendingFinish = { attackerId: attacker.id, ownerId: owner.id, anchors: hits, remaining: FINISH_SECONDS, contact }
        match.phase = 'FINISH_SLOW_MOTION'; match.phaseElapsed = 0
        match.events.push({ type: 'slow', fighterId: owner.id, ...contact })
        return
      }
      breakLines(match, owner, hits, contact)
    }
  }
}

export function stepMatch(match: MatchState, realDt: number, random: () => number = Math.random): void {
  match.events.length = 0
  if (match.phase === 'RESULTS') return
  if (match.phase === 'PRE_BATTLE') {
    match.phaseElapsed += realDt
    if (match.phaseElapsed >= 1.8) { match.phase = 'COUNTDOWN'; match.phaseElapsed = 0; match.events.push({ type: 'tick' }) }
    return
  }
  if (match.phase === 'COUNTDOWN') {
    const before = Math.floor(match.phaseElapsed)
    match.phaseElapsed += realDt
    const after = Math.floor(match.phaseElapsed)
    if (after > before && after <= 3) match.events.push({ type: 'tick' })
    if (match.phaseElapsed >= 4.1) { setBattlePhase(match); match.events.push({ type: 'fight' }) }
    return
  }
  match.phaseElapsed += realDt
  if (match.phase === 'WINNER_REVEAL') {
    if (match.phaseElapsed > 2.6) { match.phase = 'RESULTS'; match.phaseElapsed = 0 }
    return
  }
  const dt = realDt * (match.phase === 'FINISH_SLOW_MOTION' ? 0.22 : 1)
  match.elapsed += dt
  const speedFactor = speed(match)
  for (const fighter of match.fighters) {
    if (!fighter.alive) continue
    fighter.previousPosition = { ...fighter.position }
    fighter.position.x += fighter.velocity.x * dt * speedFactor
    fighter.position.y += fighter.velocity.y * dt * speedFactor
    wallBounce(match, fighter, random)
  }
  for (let i = 0; i < match.fighters.length; i++) {
    const a = match.fighters[i]
    if (!a.alive) continue
    for (let j = i + 1; j < match.fighters.length; j++) {
      const b = match.fighters[j]
      if (b.alive && resolveBodyCollision(a, b)) match.events.push({ type: 'impact', x: (a.position.x + b.position.x) / 2, y: (a.position.y + b.position.y) / 2 })
    }
  }
  if (match.phase === 'FINISH_SLOW_MOTION' && match.pendingFinish) {
    match.pendingFinish.remaining -= realDt
    if (match.pendingFinish.remaining <= 0) {
      const owner = match.fighters.find(f => f.id === match.pendingFinish?.ownerId)
      if (owner?.alive) breakLines(match, owner, match.pendingFinish.anchors, match.pendingFinish.contact)
      match.pendingFinish = undefined
      if (owner?.alive) { match.phase = 'FINAL_DUEL'; match.phaseElapsed = 0 }
    }
    return
  }
  detectLineHits(match)
}

export function rankFighters(match: MatchState): FighterRuntime[] {
  return [...match.fighters].sort((a, b) => {
    if (a.alive !== b.alive) return a.alive ? -1 : 1
    return (b.eliminationOrder ?? 0) - (a.eliminationOrder ?? 0)
  })
}

export function setBattlePhase(match: MatchState): void {
  match.phase = match.fighters.filter(f => f.alive).length === 2 ? 'FINAL_DUEL' : 'BATTLE'
  match.phaseElapsed = 0
}

export function lineCount(match: MatchState): number { return match.fighters.reduce((n, f) => n + f.lines.size, 0) }
export function speed(match: MatchState): number {
  const escalation = Math.max(0, match.elapsed - 12) * 0.012 + Math.max(0,match.elapsed-40)*.016
  return clamp(1 + escalation, 1, 1.9)
}
