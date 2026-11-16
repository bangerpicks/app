/**
 * Bounded parallel map for Firestore fan-out on Rankings.
 */

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return []
  const concurrency = Math.max(1, Math.min(limit, items.length))
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex
      nextIndex += 1
      if (index >= items.length) break
      results[index] = await fn(items[index], index)
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  return results
}