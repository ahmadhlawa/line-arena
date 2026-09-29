import { expect, it } from 'vitest'
import { enhanceColor, displayColor, canSelect, addSelection } from './fighterUtils'
import type { FighterDefinition } from '../game/types'

const fighter = (id: string): FighterDefinition => ({ id, name: id, imageSource: '', sourceType: 'built-in', autoColor: '#567890' })
it('makes dark or gray image colors visible on dark arena', () => {
  expect(enhanceColor([5, 5, 5])).toMatch(/^#[0-9a-f]{6}$/i)
  expect(enhanceColor([5, 5, 5])).not.toBe('#050505')
})
it('uses explicit manual override', () => {
  expect(displayColor({ ...fighter('a'), overrideColor: '#ff00aa' })).toBe('#ff00aa')
})
it('permits only two through six selected fighters to start and caps selection at six', () => {
  expect(canSelect([fighter('a')])).toBe(false)
  expect(canSelect([fighter('a'), fighter('b')])).toBe(true)
  const six = 'abcdef'.split('').map(fighter)
  expect(addSelection(six, fighter('g'))).toHaveLength(6)
  expect(addSelection(six, fighter('a'))).toHaveLength(5)
})
