import { expect, it } from 'vitest'
import { builtInFighters } from '../data/builtInFighters'
import { createMatch, rankFighters, stepMatch } from './engine'

function randomSeed(seed: number) { let value = seed; return () => ((value = (value * 1664525 + 1013904223) >>> 0) / 4294967296) }
const percentile = (values: number[], fraction: number) => [...values].sort((a, b) => a - b)[Math.round((values.length - 1) * fraction)]
it.each([2, 3, 4, 5, 6])('completes a distribution of %i-fighter matches using physical line rules', n => {
  const durations: number[] = [], gaps: number[] = [], densities: number[] = []
  let walls = 0, created = 0, meaningfulEvents = 0, activeTime = 0
  for (let seed = 1; seed <= 24; seed++) {
    const random = randomSeed(seed * 7919 + n)
    const match = createMatch(builtInFighters.slice(0, n), random)
    let sawSlow = false, lastEvent = 0, longestGap = 0, density = 0, samples = 0, activeSeconds = 0
    let steps = 0
    for (; steps < 180 * 120 && match.phase !== 'RESULTS'; steps++) {
      if (['BATTLE','FINAL_DUEL','FINISH_SLOW_MOTION'].includes(match.phase)) activeSeconds += 1/120
      stepMatch(match, 1 / 120, random)
      sawSlow ||= match.phase === 'FINISH_SLOW_MOTION'
      if (['BATTLE', 'FINAL_DUEL', 'FINISH_SLOW_MOTION'].includes(match.phase)) {
        density += match.fighters.reduce((sum, f) => sum + f.lines.size, 0); samples++
        const events = match.events.filter(e => ['wall', 'break', 'impact', 'eliminate'].includes(e.type))
        if (events.length) { longestGap = Math.max(longestGap, match.elapsed - lastEvent); lastEvent = match.elapsed }
        meaningfulEvents += events.length
        walls += match.events.filter(e => e.type === 'wall').length
        created += match.events.filter(e => e.type === 'create').reduce((sum, e) => sum + (e.count ?? 0), 0)
      }
    }
    expect(match.phase, `${n} fighters, seed ${seed}`).toBe('RESULTS')
    expect(match.fighters.filter(f => f.alive)).toHaveLength(1)
    expect(sawSlow).toBe(true)
    expect(rankFighters(match)[0].id).toBe(match.winnerId)
    expect(match.fighters.every(f => Number.isFinite(f.position.x) && Math.hypot(f.position.x, f.position.y) <= 1)).toBe(true)
    durations.push(activeSeconds); activeTime += activeSeconds
    gaps.push(longestGap); densities.push(density / samples)
  }
  console.info(`${n} fighters: active min/p10/p50/p90/max ${[0,.1,.5,.9,1].map(p => percentile(durations,p).toFixed(1)).join('/')}s; event gap p50/p90 ${[.5,.9].map(p => percentile(gaps,p).toFixed(1)).join('/')}s; events/s ${(meaningfulEvents/activeTime).toFixed(2)}; mean lines ${(densities.reduce((a,b)=>a+b)/densities.length).toFixed(1)}; lines/wall ${(created/walls).toFixed(1)}`)
  expect(percentile(durations, .5)).toBeGreaterThanOrEqual(30)
  expect(percentile(durations, .5)).toBeLessThanOrEqual(65)
  expect(percentile(durations, .9)).toBeLessThan(110)
  expect(percentile(gaps, .9)).toBeLessThan(3.8)
}, 30000)
