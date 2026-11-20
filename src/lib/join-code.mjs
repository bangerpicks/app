/**
 * Normalize join codes for lookup (uppercase, no spaces).
 * @param {string} raw
 * @returns {string}
 */
export function normalizeJoinCode(raw) {
  if (!raw || typeof raw !== 'string') return ''
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * @param {string} raw
 * @returns {boolean}
 */
export function isValidJoinCodeFormat(raw) {
  const n = normalizeJoinCode(raw)
  return n.length >= 4 && n.length <= 16
}