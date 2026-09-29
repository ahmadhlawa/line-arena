import type { FighterDefinition } from '../game/types'

const DB = 'line-arena-v1'
const STORE = 'fighters'
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1)
    request.onupgradeneeded = () => { request.result.createObjectStore(STORE, { keyPath: 'id' }) }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
export async function loadCustomFighters(): Promise<FighterDefinition[]> {
  const db = await openDb()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const request = tx.objectStore(STORE).getAll()
      request.onsuccess = () => resolve(request.result as FighterDefinition[])
      request.onerror = () => reject(request.error)
    })
  } finally { db.close() }
}
export async function saveCustomFighter(fighter: FighterDefinition): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(fighter)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally { db.close() }
}
export async function deleteCustomFighter(id: string): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally { db.close() }
}
