import type { FighterDefinition } from '../game/types'

const roster: [string, string, string, string, string][] = [
  ['browsers','Chrome','🌐','#4de0f7',''],['browsers','Firefox','🦊','#ff884f',''],['browsers','Safari','🧭','#8cb8ff',''],['browsers','Edge','🌊','#3de6ba',''],['browsers','Opera','⭕','#ff5578',''],['browsers','Brave','🦁','#ffb45e',''],
  ['countries','Brazil','🇧🇷','#f9db52',''],['countries','Japan','🇯🇵','#ff667e',''],['countries','France','🇫🇷','#69a8ff',''],['countries','Germany','🇩🇪','#f9be5c',''],['countries','Argentina','🇦🇷','#71d4ff',''],['countries','Spain','🇪🇸','#ff6666',''],
  ['clubs','Madrid','👑','#d9b8ff',''],['clubs','Barcelona','⚽','#e968a7',''],['clubs','Milan','🔴','#ff6772',''],['clubs','Chelsea','🔵','#65a6ff',''],['clubs','Dortmund','🟡','#ffe16b',''],['clubs','City','🌟','#8ad5fa',''],
  ['cars','Rocket','🏎️','#f86d7c',''],['cars','Volt','⚡','#f5da5b',''],['cars','Drift','🏁','#85e7dc',''],['cars','Turbo','🔥','#ff9b58',''],['cars','Comet','☄️','#ab8bff',''],['cars','Nitro','🚀','#68bbff',''],
]
function portrait(emoji: string, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" rx="128" fill="#142037"/><circle cx="128" cy="128" r="112" fill="${color}" fill-opacity=".18"/><text x="128" y="162" text-anchor="middle" font-size="112" font-family="Arial, sans-serif">${emoji}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
export const builtInFighters: FighterDefinition[] = roster.map(([group, name, emoji, autoColor]) => ({
  id: `${group}-${name.toLowerCase()}`, name, imageSource: portrait(emoji, autoColor), sourceType: 'built-in', group, autoColor,
}))
