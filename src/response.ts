'use strict'
import {ServerResponse} from 'http'
import * as assert from 'assert'
import * as statuses from 'statuses'
import {Socket} from 'net'
import {extname} from 'path'
import {isJSON} from './utils/isJSON'
import {Koa} from './application'
import {Context} from './context'

const getType = require('mime-types').contentType
const vary = require('vary')
const contentDisposition = require('content-disposition')
const typeis = require('type-is')

export class Response {
  private _body: Object
  private _explicitStatus: Boolean

  constructor(public app: Koa, public res: ServerResponse, public ctx: Context) {
    this._body = null
    this._explicitStatus = false
  }

  get socket(): Socket {
    return this.ctx.request.socket
  }

  get header(): any {
    return this.res._headers || {} // NOTE: Private property
  }

  get headers(): any {
    return this.header
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

  get type(): string {
    const type = this.get('Content-Type')
    if (!type) return ''
    return type.split(';')[0]
  }

  set type(val: string) {
    const type: string = getType(val)
    if (type) {
      this.set('Content-Type', val)
    } else {
      this.remove('Content-Type')
    }
  }

  get body(): any {
    return this._body
  }

  set body(val: any) {
    // const original: any = this._body
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
      if (setType) this.set('Content-Type', /^\s*</.test(String(val)) ? 'html' : 'text')

      this.set('Content-Length', String(Buffer.byteLength(String(val))))
      return
    }

    if (Buffer.isBuffer(val)) {
      if (setType) this.set('Content-Type', 'bin')
      this.set('Content-Length', String(val.length))
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
    this.set('Content-Length', String(val))
  }

  get headerSent(): Boolean {
    return this.res.headersSent
  }

  get lastModified() {
    const date = this.get('last-modified')
    if (date) return new Date(date)
  }

  set lastModified(val: Date) {
    this.set('Last-Modified', val.toUTCString())
  }

  get etag() {
    return this.get('ETag')
  }

  set etag(val: string) {
    if (!/^(W\/)?"/.test(val)) val = `"${val}"`
    this.set('ETag', val)
  }

  get writeable(): Boolean {
    const socket = this.socket
    if (!socket) return false
    return socket.writable
  }

  vary(field: string): void {
    vary(this.res, field)
  }

  is(types: any): any {
    const type = this.type
    if (!types) return type || false
    if (!Array.isArray(types)) types = [].slice.call(arguments)
    return typeis(type, types)
  }

  redirect(url: string, alt: string): void {
    if (url === 'back') url = this.ctx.request.get('Referrer') || alt || '/'
    this.set('Location', url)

    if (!statuses.redirect[this.status]) this.status = 302
    if (this.ctx.request.accept('html')) {
      this.type = 'text/html; charset=utf-8'
      this.body = `Redirecting to <a href="${url}">${url}</a>.`
      return
    }

    this.type = 'text/plain; charset=utf-8'
    this.body = `Redirecting to ${url}.`
  }

  attachment(filename?: string): void {
    if (filename) this.type = extname(filename)
    this.set('Content-Disposition', contentDisposition(filename))
  }

  get(field: string): string {
    field = field.toLowerCase()
    return this.res.getHeader(field) || ''
  }

  set(field: any, val: any) {
    if (2 === arguments.length) {
      if (Array.isArray(val)) val = val.map(String)
      else val = String(val)
      this.res.setHeader(field, val)
    } else {
      for (const key in field) {
        this.set(key, field[key])
      }
    }
  }

  remove(field: string): void {
    this.res.removeHeader(field)
  }

  append(field: string, val: any) {
    const prev = this.get(field)

    if (prev) {
      val = Array.isArray(prev)
        ? prev.concat(val)
        : [prev].concat(val)
    }
    return this.set(field, val)
  }

  toJSON(): any {
    return {
      status: this.status,
      message: this.message,
      header: this.header
    }
  }

  inspect(): any {
    if (!this.res) return
    const object = this.toJSON()
    object.body = this.body
    return object
  }
}
