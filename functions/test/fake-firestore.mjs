/**
 * Minimal in-memory Firestore stand-in for callable tests (doc/collection refs,
 * transactions, set/update/merge). Sentinels (serverTimestamp/increment) are stored raw.
 */
export function createFakeDb(seed = {}) {
  const store = new Map(Object.entries(seed).map(([k, v]) => [k, structuredClone(v)]))
  // Timestamps can't be structuredClone'd as class instances; keep originals.
  for (const [k, v] of Object.entries(seed)) store.set(k, { ...v })

  const snap = (path) => {
    const data = store.get(path)
    return {
      id: path.split('/').pop(),
      exists: data !== undefined,
      data: () => (data === undefined ? undefined : { ...data }),
      ref: docRef(path),
    }
  }
  function docRef(path) {
    return {
      path,
      id: path.split('/').pop(),
      collection: (name) => colRef(`${path}/${name}`),
      get: async () => snap(path),
      set: async (data, opts) => applySet(path, data, opts),
    }
  }
  function colRef(path) {
    return {
      path,
      isCollection: true,
      doc: (id) => docRef(`${path}/${id}`),
      get: async () => querySnap(path),
    }
  }
  function querySnap(colPath) {
    const docs = []
    for (const key of store.keys()) {
      if (key.startsWith(colPath + '/') && !key.slice(colPath.length + 1).includes('/')) {
        docs.push(snap(key))
      }
    }
    return { docs, empty: docs.length === 0, size: docs.length }
  }
  function applySet(path, data, opts) {
    if (opts?.merge && store.has(path)) store.set(path, { ...store.get(path), ...data })
    else store.set(path, { ...data })
  }
  function applyUpdate(path, data) {
    if (!store.has(path)) throw new Error(`update on missing doc ${path}`)
    store.set(path, { ...store.get(path), ...data })
  }
  const writes = []
  const db = {
    store,
    writes,
    collection: (name) => colRef(name),
    doc: (path) => docRef(path),
    async runTransaction(fn) {
      const pending = []
      const tx = {
        get: async (ref) => (ref.isCollection ? querySnap(ref.path) : snap(ref.path)),
        set: (ref, data, opts) => pending.push(['set', ref.path, data, opts]),
        update: (ref, data) => pending.push(['update', ref.path, data]),
      }
      const result = await fn(tx)
      for (const [op, path, data, opts] of pending) {
        writes.push({ op, path, data })
        if (op === 'set') applySet(path, data, opts)
        else applyUpdate(path, data)
      }
      return result
    },
  }
  return db
}
