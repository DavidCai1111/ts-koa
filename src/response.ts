'use strict'
import {ServerResponse, IncomingMessage} from 'http'
import * as assert from 'assert'
import * as statuses from 'statuses'
import {Socket} from 'net'
import {extname} from 'path'
import {isJSON} from './utils/isJSON'
import {Koa} from './application'
import {IContext} from './context'
import {IRequest} from './request'

const getType = require('mime-types').contentType
const vary = require('vary')
const contentDisposition = require('content-disposition')
const typeis = require('type-is').is
const onFinished = require('on-finished')
const ensureErrorHandler = require('error-inject')
const destroy = require('destroy')
const escape = require('escape-html')

export interface IResponse {
  _body?: any
  _explicitStatus?: Boolean
  app?: Koa
  res?: ServerResponse
  req?: IncomingMessage
  ctx?: IContext
  request?: IRequest
  socket?: Socket
  header?: any
  headers?: any
  status?: number
  message?: string
  type?: string
  body?: any
  length?: any
  headerSent?: Boolean
  lastModified?: Date
  etag?: string
  writable?: Boolean
  is?: (types: any) => any
  redirect?: (url: string, alt: string) => void
  attachment?: (filename?: string) => void
  vary?: (field: string) => void
  get?: (field: string) => string
  set?: (field: any, val: any) => void
  remove?: (field: string) => void
  append?: (field: string, val: any) => void
  toJSON?: () => any
  inspect?: () => any
}

export const koaResponse: IResponse = {
  get socket(): Socket {
    return this.ctx.request.socket
  },
  get header(): any {
    return this.res._headers || {} // NOTE: Private property
  },
  get headers(): any {
    return this.header
  },
  get status(): number {
    return this.res.statusCode
  },
  set status(code: number) {
    assert(statuses[code], `Invaild status code: ${code}`)
    this._explicitStatus = true
    this.res.statusCode = code
    this.res.statusMessage = statuses[code]
    if (this.body && statuses.empty[code]) this.body = null
  },
  get message(): string {
    return this.res.statusMessage || statuses[this.status]
  },
  set message(val: string) {
    this.res.statusMessage = val
  },
  get type(): string {
    const type = this.get('Content-Type')
    if (!type) return ''
    return type.split(';')[0]
  },
  set type(val: string) {
    const type: any = getType(val) || false
    if (type) {
      this.set('Content-Type', type)
    } else {
      this.remove('Content-Type')
    }
  },
  get body(): any {
    return this._body
  },
  set body(val: any) {
    const original: any = this._body
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
      if (setType) this.type = /^\s*</.test(val) ? 'html' : 'text'

      this.length = Buffer.byteLength(val)
      return
    }

    if (Buffer.isBuffer(val)) {
      if (setType) this.type = 'bin'
      this.length = val.length
      return
    }

    if ('function' === typeof val.pipe) {
      onFinished(this.res, destroy.bind(null, val))
      ensureErrorHandler(val, this.ctx.onerror)

      if (null != original && original !== val) this.remove('Content-Length')
      if (setType) this.type = 'bin'
      return
    }

    this.remove('Content-Length')
    this.type = 'json'
  },
  get length(): number {
    const length = this.header['content-length']
    const body = this.body
    if (length == null) {
      if (!body) return
      if (typeof body === 'string') return Buffer.byteLength(body)
      if (Buffer.isBuffer(body)) return body.length
      if (isJSON(body)) return Buffer.byteLength(JSON.stringify(body))
      return
    }

    return ~~length
  },
  set length(val: number) {
    this.set('Content-Length', val)
  },
  get headerSent(): Boolean {
    return this.res.headersSent
  },
  get lastModified() {
    const date = this.get('last-modified')
    if (date) return new Date(date)
  },
  set lastModified(val: any) {
    if ('string' === typeof val) val = new Date(val)
    this.set('Last-Modified', val.toUTCString())
  },
  get etag() {
    return this.get('ETag')
  },
  set etag(val: string) {
    if (!/^(W\/)?"/.test(val)) val = `"${val}"`
    this.set('ETag', val)
  },
  get writable(): Boolean {
    const socket = this.socket
    if (!socket) return false
    return socket.writable
  },
  vary(field: string) {
    vary(this.res, field)
  },
  is(types: any) {
    const type = this.type
    if (!types) return type || false
    if (!Array.isArray(types)) types = [].slice.call(arguments)
    return typeis(type, types)
  },
  redirect(url: string, alt: string) {
    if (url === 'back') url = this.ctx.request.get('Referrer') || alt || '/'
    this.set('Location', url)

    if (!statuses.redirect[this.status]) this.status = 302
    if (this.ctx.accepts('html')) {
      url = escape(url)
      this.type = 'text/html; charset=utf-8'
      this.body = `Redirecting to <a href="${url}">${url}</a>.`
      return
    }

    this.type = 'text/plain; charset=utf-8'
    this.body = `Redirecting to ${url}.`
  },
  attachment(filename?: string) {
    if (filename) this.type = extname(filename)
    this.set('Content-Disposition', contentDisposition(filename))
  },
  get(field: string) {
    field = field.toLowerCase()
    return this.header[field] || ''
  },
  set(field: any, val: any) {
    if (2 === arguments.length) {
      if (Array.isArray(val)) {
        val = val.map(String)
      } else {
        val = String(val)
      }
      this.res.setHeader(field, val)
    } else {
      for (const key in field) {
        this.set(key, field[key])
      }
    }
  },
  remove(field: string) {
    this.res.removeHeader(field)
  },
  append(field: string, val: any) {
    const prev = this.get(field)

    if (prev) {
      val = Array.isArray(prev)
        ? prev.concat(val)
        : [prev].concat(val)
    }
    return this.set(field, val)
  },
  toJSON() {
    return {
      status: this.status,
      message: this.message,
      header: this.header
    }
  },
  inspect() {
    if (!this.res) return
    const object = this.toJSON()
    object.body = this.body
    return object
  }
}
