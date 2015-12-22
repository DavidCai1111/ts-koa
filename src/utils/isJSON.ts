export function isJSON(body: any): Boolean {
  'use strict'
  if (typeof body === 'string') return false
  if (Buffer.isBuffer(body) === true) return false
  if (typeof body.pipe === 'function') return false
  return true
}
