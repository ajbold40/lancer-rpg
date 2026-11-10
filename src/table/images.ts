// Background images are too big for localStorage, so they go in IndexedDB.
// Milestone 2 moves them to Supabase Storage.

const DB = 'lancer-table'
const STORE = 'images'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function putImage(id: string, blob: Blob): Promise<void> {
  const db = await open()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(blob, id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function getImage(id: string): Promise<Blob | null> {
  try {
    const db = await open()
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(id)
      req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null)
      req.onerror = () => reject(req.error)
    })
    db.close()
    return blob
  } catch {
    return null
  }
}

export async function deleteImage(id: string): Promise<void> {
  try {
    const db = await open()
    db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id)
    db.close()
  } catch {
    // nothing to clean up
  }
}

/** Reads an image file's pixel size. */
export function imageSize(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      reject(new Error('Not an image'))
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}
