'use strict'
import {ServerResponse} from 'http'
import * as assert from 'assert'
import * as statuses from 'statuses'
import {isJSON} from './utils/isJSON'
const getType = require('mime-types').contentType

export class Response {
  public response: Object
  private _body: Object
  private _explicitStatus: Boolean

  constructor(public res: ServerResponse) {
    this._body = null
    this._explicitStatus = false
  }

  get status(): number {
    return this.res.statusCode
  }

  set status(code: number) {
    assert(statuses[code], `Invaild status code: ${code}`)
    this._explicitStatus = true
    this.res.statusCode = code
    this.res.statusMessage = statuses[code]
    if (this._body || statuses.empty[code]) this._body = null
  }

  get message(): string {
    return this.res.statusMessage
  }

  set message(val: string) {
    this.res.statusMessage = val
  }

  get(field: string): string {
    field = field.toLowerCase()
    return this.res.getHeader(field) || ''
  }

  set(field: string, vals: Array<Object>) {
    for (let val of vals) {
      this.res.setHeader(field, String(val))
    }
  }

  remove(field: string): void {
    this.res.removeHeader(field)
  }

  get type(): string {
    const type = this.get('Content-Type')
    if (!type) return ''
    return type.split(';')[0]
  }

  set type(val: string) {
    const type: string = getType(val)
    if (type) {
      this.set('Content-Type', [val])
    } else {
      this.remove('Content-Type')
    }
  }

  get body(): Object {
    return this._body
  }

  set body(val: Object) {
    const original: Object = this._body
    this._body = val

    if (val === null) {
      if (!statuses.empty[this.status]) this.status = 204
      this.remove('Content-Type')
      this.remove('Content-Length')
      this.remove('Transfer-Encoding')
      return
    }

    if (!this._explicitStatus) this.status = 200
    const setType: Boolean = !this.get('Content-Type')

    if (typeof val === 'string') {
      if (setType) this.set('Content-Type', [/^\s*</.test(String(val)) ? 'html' : 'text'])

      this.set('Content-Length', [String(Buffer.byteLength(String(val)))])
      return
    }

    if (Buffer.isBuffer(val)) {
      if (setType) this.set('Content-Type', ['bin'])
      this.set('Content-Length', [String(val.length)])
      return
    }

    this.remove('Content-Length')
  }

  get length(): number {
    const length = this.get('Content-Length')
    const body = this.body

    if (length === null) {
      if (!body) return 0
      if (typeof body === 'string') return Buffer.byteLength(String(body))
      if (Buffer.isBuffer(body)) return body.length
      if (isJSON(body)) return Buffer.byteLength(JSON.stringify(body))
      return 0
    }

    return ~~length
  }

  set length(val: number) {
    this.set('Content-Length', [val])
  }
}
