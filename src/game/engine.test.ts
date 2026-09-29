import { describe, expect, it } from 'vitest'
import { createMatch, recordWallContact, stepMatch, rankFighters, resolveBodyCollision, sweptCircleHitsLine, setBattlePhase, speed } from './engine'
import type { FighterDefinition } from './types'

const definitions: FighterDefinition[] = ['A', 'B', 'C', 'D', 'E', 'F'].map((name, i) => ({
  id: name, name, imageSource: '', sourceType: 'built-in', autoColor: ['#ff496c','#49dafa','#f8d85c','#9e80ff','#5bea9d','#ff9d52'][i],
}))
const rng = () => 0.5

describe('initialization and wall contacts', () => {
  it('keeps an energetic cruising pace and progressively escalates without an opening slowdown', () => {
    const match = createMatch(definitions.slice(0, 2), rng)
    expect(Math.hypot(match.fighters[0].velocity.x, match.fighters[0].velocity.y) * speed(match)).toBeCloseTo(0.38, 5)
    expect(speed(match)).toBe(1)
    match.elapsed = 8
    expect(speed(match)).toBe(1)
    match.elapsed = 30
    expect(speed(match)).toBeGreaterThan(1)
    match.elapsed = 300
    expect(speed(match)).toBeLessThanOrEqual(1.9)
  })
  it('seeds equal separated fans before battle for 2–6 fighters', () => {
    for (let n = 2; n <= 6; n++) {
      const match = createMatch(definitions.slice(0, n), rng)
      expect(new Set(match.fighters.map(f => f.lines.size)).size).toBe(1)
      expect(match.fighters[0].lines.size).toBeGreaterThan(8)
      const all = match.fighters.flatMap(f => [...f.lines])
      expect(new Set(all).size).toBe(all.length)
      expect(all.length).toBeGreaterThan(200)
    }
  })
  it('adds nothing without wall contact and fans across nearby contacts', () => {
    const match = createMatch(definitions.slice(0, 2), rng)
    const fighter = match.fighters[0]
    const before = fighter.lines.size
    setBattlePhase(match)
    fighter.velocity = { x: 0, y: 0 }
    stepMatch(match, 1 / 120, rng)
    expect(fighter.lines.size).toBe(before)
    fighter.lines = new Set([0])
    expect(recordWallContact(match, fighter, 40)).toBe(7)
    expect(fighter.lines.has(40)).toBe(true)
    expect(recordWallContact(match, fighter, 45)).toBe(2)
    expect([41, 42, 43, 44, 45].every(i => fighter.lines.has(i))).toBe(true)
    const after = fighter.lines.size
    recordWallContact(match, fighter, 140)
    expect(fighter.lines.size).toBe(after + 7)
    recordWallContact(match, fighter, 140)
    expect(fighter.lines.size).toBe(after + 7)
  })
  it('creates only a small local wall cluster across the anchor seam', () => {
    const match = createMatch(definitions.slice(0, 2), rng)
    const fighter = match.fighters[0]
    fighter.lines.clear()
    expect(recordWallContact(match, fighter, 239)).toBe(7)
    expect([...fighter.lines].sort((a,b) => a-b)).toEqual([0,1,2,236,237,238,239])
    expect(recordWallContact(match, fighter, 3)).toBe(1)
    expect(fighter.lines.has(3)).toBe(true)
  })
  it('rebounds grazing wall contacts inward instead of repeatedly skating along the rim', () => {
    const match = createMatch(definitions.slice(0,2),rng)
    setBattlePhase(match)
    const fighter = match.fighters[0]
    fighter.position = { x: .936, y: 0 }; fighter.velocity = { x: .001, y: .38 }
    stepMatch(match,1/120,() => 0)
    const magnitude = Math.hypot(fighter.velocity.x,fighter.velocity.y)
    const normal = Math.hypot(fighter.position.x,fighter.position.y)
    expect(-(fighter.velocity.x*fighter.position.x+fighter.velocity.y*fighter.position.y)/normal/magnitude).toBeGreaterThanOrEqual(.279)
    const count = fighter.lines.size
    for (let i=0;i<30;i++) stepMatch(match,1/120,rng)
    expect(fighter.lines.size).toBe(count)
  })
})

describe('body collisions and elimination', () => {
  it('keeps post-contact motion bounded when a glancing bounce nearly stops a fighter', () => {
    const [a,b] = createMatch(definitions.slice(0,2), rng).fighters
    a.position = { x: -.03, y: 0 }; b.position = { x: .03, y: 0 }
    a.velocity = { x: .38, y: 0 }; b.velocity = { x: -.01, y: .38 }
    resolveBodyCollision(a,b)
    for (const fighter of [a,b]) {
      expect(Math.hypot(fighter.velocity.x, fighter.velocity.y)).toBeGreaterThanOrEqual(.32)
      expect(Math.hypot(fighter.velocity.x, fighter.velocity.y)).toBeLessThanOrEqual(.46)
    }
    expect(a.velocity.x).toBeLessThan(0)
  })
  it('separates coincident bodies without invalid positions or velocities', () => {
    const [a,b] = createMatch(definitions.slice(0,2), rng).fighters
    a.position = { x: 0, y: 0 }; b.position = { x: 0, y: 0 }
    resolveBodyCollision(a,b)
    expect(Math.hypot(a.position.x-b.position.x,a.position.y-b.position.y)).toBeCloseTo(a.radius+b.radius)
  })
  it('separates overlapping bodies already moving apart without reporting another impact', () => {
    const [a,b] = createMatch(definitions.slice(0,2),rng).fighters
    a.position = { x: -.03, y: 0 }; b.position = { x: .03, y: 0 }
    a.velocity = { x: -.38, y: 0 }; b.velocity = { x: .38, y: 0 }
    expect(resolveBodyCollision(a,b)).toBe(false)
    expect(b.position.x-a.position.x).toBeCloseTo(a.radius+b.radius)
  })
  it('reports line-break feedback at the crossing rather than the owner', () => {
    const match = createMatch(definitions.slice(0,3), rng)
    setBattlePhase(match)
    const [a,b,c] = match.fighters
    a.position = { x: .5, y: -.03 }; a.velocity = { x: 0, y: .38 }
    b.position = { x: 0, y: 0 }; b.velocity = { x: 0, y: 0 }; b.lines = new Set([0,60])
    c.position = { x: -.5, y: -.5 }; c.velocity = { x: 0, y: 0 }
    stepMatch(match,1/120,rng)
    const event = match.events.find(e => e.type === 'break' && e.fighterId === b.id)
    expect(event?.x).toBeCloseTo(.5)
    expect(event?.y).toBeCloseTo(0)
  })
  it('sweeps a fast moving body across a line', () => {
    expect(sweptCircleHitsLine({ x: -0.8, y: 0 }, { x: 0.8, y: 0 }, 0.05, { x: 0, y: -0.5 }, { x: 0, y: 0.5 })).toBe(true)
  })
  it('does not report a hit for separated collinear segments', () => {
    expect(sweptCircleHitsLine({ x: -1, y: 0 }, { x: -0.8, y: 0 }, 0.02, { x: 0.2, y: 0 }, { x: 0.8, y: 0 })).toBe(false)
  })
  it('breaks only enemy current-position lines and grants nothing', () => {
    const match = createMatch(definitions.slice(0, 3), rng)
    const [attacker, owner, third] = match.fighters
    setBattlePhase(match)
    attacker.lines = new Set([180])
    owner.lines = new Set([0, 1])
    third.position = { x: -0.4, y: -0.7 }; third.velocity = { x: 0, y: 0 }
    owner.position = { x: 0, y: 0 }; owner.velocity = { x: 0, y: 0 }
    attacker.position = { x: 0.5, y: -0.2 }
    attacker.velocity = { x: 0, y: 2 }
    const count = attacker.lines.size
    for (let i = 0; i < 25; i++) stepMatch(match, 1 / 120, rng)
    expect(owner.lines.size).toBe(0)
    expect(attacker.lines.size).toBe(count)
    expect(owner.alive).toBe(false)
    expect(rankFighters(match).at(-1)?.id).toBe(owner.id)
    expect(match.phase).not.toBe('FINISH_SLOW_MOTION')
    const stopped = { ...owner.position }
    expect(recordWallContact(match, owner, 50)).toBe(0)
    stepMatch(match, 1 / 120, rng)
    expect(owner.position).toEqual(stopped)
  })
  it('fighter contact changes motion but never lines or life', () => {
    const match = createMatch(definitions.slice(0, 2), rng)
    const [a, b] = match.fighters
    setBattlePhase(match)
    a.position = { x: -0.03, y: 0 }; b.position = { x: 0.03, y: 0 }
    a.velocity = { x: 1, y: 0 }; b.velocity = { x: -1, y: 0 }
    const counts = match.fighters.map(f => f.lines.size)
    resolveBodyCollision(a, b)
    expect(a.velocity.x).toBeLessThan(0)
    expect(b.velocity.x).toBeGreaterThan(0)
    expect(match.fighters.map(f => f.lines.size)).toEqual(counts)
    expect(a.alive && b.alive).toBe(true)
  })
  it('does not break own lines', () => {
    const match = createMatch(definitions.slice(0, 2), rng)
    const a = match.fighters[0]
    setBattlePhase(match)
    a.lines = new Set([0])
    a.position = { x: 0.2, y: 0 }; a.velocity = { x: 0, y: 0 }
    stepMatch(match, 1 / 120, rng)
    expect(a.lines.size).toBe(1)
  })
  it('does not destroy lines when other lines cross them', () => {
    const match = createMatch(definitions.slice(0, 2), rng)
    setBattlePhase(match)
    const before = match.fighters.map(f => f.lines.size)
    for (const fighter of match.fighters) fighter.velocity = { x: 0, y: 0 }
    stepMatch(match, 1 / 120, rng)
    expect(match.fighters.map(f => f.lines.size)).toEqual(before)
  })
})

describe('final duel and rematch', () => {
  it('keeps seeded lines still through intro and countdown before battle', () => {
    const match = createMatch(definitions.slice(0, 2), rng)
    const start = match.fighters.map(f => ({ ...f.position }))
    for (let i = 0; i < 240; i++) stepMatch(match, 1 / 120, rng)
    expect(match.phase).toBe('COUNTDOWN')
    expect(match.fighters.map(f => f.position)).toEqual(start)
    for (let i = 0; i < 510; i++) stepMatch(match, 1 / 120, rng)
    expect(match.phase).toBe('FINAL_DUEL')
  })
  it('reserves the last-line break for global slow motion, then resolves winner', () => {
    const match = createMatch(definitions.slice(0, 2), rng)
    const [a, b] = match.fighters
    setBattlePhase(match)
    a.lines = new Set([180]); b.lines = new Set([0])
    b.position = { x: 0, y: 0 }; b.velocity = { x: 0, y: 0 }
    a.position = { x: 0.4, y: -0.15 }; a.velocity = { x: 0, y: 2 }
    for (let i = 0; i < 20 && match.phase !== 'FINISH_SLOW_MOTION'; i++) stepMatch(match, 1 / 120, rng)
    expect(match.phase).toBe('FINISH_SLOW_MOTION')
    expect(b.alive).toBe(true)
    const elapsed = match.elapsed
    stepMatch(match,1/120,rng)
    expect(match.elapsed-elapsed).toBeCloseTo(.22/120,8)
    for (let i = 0; i < 130; i++) stepMatch(match, 1 / 120, rng)
    expect(b.alive).toBe(false)
    expect(match.winnerId).toBe(a.id)
    expect(rankFighters(match).map(f => f.id)).toEqual([a.id, b.id])
  })
  it('returns to final duel if a real wall contact adds a line during slow motion', () => {
    const match = createMatch(definitions.slice(0, 2), rng)
    const [a, b] = match.fighters
    setBattlePhase(match)
    a.lines = new Set([180]); b.lines = new Set([0])
    b.position = { x: 0, y: 0 }; b.velocity = { x: 0, y: 0 }
    a.position = { x: 0.4, y: -0.15 }; a.velocity = { x: 0, y: 2 }
    for (let i = 0; i < 20 && match.phase !== 'FINISH_SLOW_MOTION'; i++) stepMatch(match, 1 / 120, rng)
    expect(match.phase).toBe('FINISH_SLOW_MOTION')
    recordWallContact(match, b, 100)
    for (let i = 0; i < 130; i++) stepMatch(match, 1 / 120, rng)
    expect(b.alive).toBe(true)
    expect(match.phase).toBe('FINAL_DUEL')
  })
  it('rematch preserves definitions and changes runtime starts', () => {
    const first = createMatch(definitions.slice(0, 2), () => 0.2)
    const second = createMatch(definitions.slice(0, 2), () => 0.8)
    expect(second.fighters.map(f => f.definitionId)).toEqual(first.fighters.map(f => f.definitionId))
    expect(second.fighters[0].position).not.toEqual(first.fighters[0].position)
  })
})
