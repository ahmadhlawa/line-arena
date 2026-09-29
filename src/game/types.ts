export type Vec2 = { x: number; y: number }
export type FighterDefinition = {
  id: string
  name: string
  imageSource: string
  sourceType: 'built-in' | 'custom'
  autoColor: string
  overrideColor?: string
  group?: string
}
export type FighterRuntime = {
  id: string
  definitionId: string
  name: string
  imageSource: string
  color: string
  position: Vec2
  previousPosition: Vec2
  velocity: Vec2
  radius: number
  lines: Set<number>
  lastWallContact?: number
  alive: boolean
  eliminationOrder?: number
}
export type Phase = 'PRE_BATTLE' | 'COUNTDOWN' | 'BATTLE' | 'FINAL_DUEL' | 'FINISH_SLOW_MOTION' | 'WINNER_REVEAL' | 'RESULTS'
export type GameEvent = { type: 'wall' | 'create' | 'break' | 'impact' | 'eliminate' | 'duel' | 'slow' | 'victory' | 'tick' | 'fight'; fighterId?: string; count?: number; anchors?: number[]; x?: number; y?: number }
export type MatchState = {
  fighters: FighterRuntime[]
  phase: Phase
  elapsed: number
  phaseElapsed: number
  events: GameEvent[]
  winnerId?: string
  eliminationCount: number
  pendingFinish?: { attackerId: string; ownerId: string; anchors: number[]; remaining: number; contact: Vec2 }
}
