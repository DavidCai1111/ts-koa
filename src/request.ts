'use strict'
import {IncomingMessage, ServerResponse} from 'http'
import {Socket} from 'net'
import {format} from 'url'
import {Koa} from './application'
const qs = require('parseurl')
const fresh = require('fresh')

const parse = qs.parse
const stringify = qs.stringify

export class Request {
  private _querycache: string

  constructor(public app: Koa, public req: IncomingMessage, public res: ServerResponse) {}

  get(field: string): string {
    const req = this.req
    switch (field = field.toLowerCase()) {
      case 'referer':
      case 'referrer':
        return req.headers.referrer || req.headers.referer || ''
      default:
        return req.headers[field] || ''
    }
  }

  get headers(): Object {
    return this.req.headers
  }

  get header(): Object {
    return this.req.headers
  }

  get method(): string {
    return this.req.method
  }

  set method(method: string) {
    this.req.method = method
  }

  get length(): any {
    const len = this.get('Content-Length')
    if (len === '') return
    return ~~len
  }

  get url(): string {
    return this.req.url
  }

  set url(val: string) {
    this.req.url = val
  }

  get origin(): string {
    return `${this.protocol}://${this.host}`
  }

  get originalUrl(): string {
    return this.req.url
  }

  get href(): string {
    if (/^https?:\/\//i.test(this.originalUrl)) return this.originalUrl
    return `${this.origin}${this.originalUrl}`
  }

  get path(): string {
    return parse(this.req).pathname
  }

  set path(val: string) {
    const url: any = parse(this.req)
    if (url.pathname === val) return
    url.pathname = val
    url.path = null
  }

  get querystring(): string {
    if (!this.req) return ''
    return parse(this.req).query || ''
  }

  set querystring(val: string) {
    const url :any = parse(this.req)
    if (url.search === `?${val}`) return
    url.search = val
    url.path = null

    this.url = format(url)
  }

  get query(): Object {
    const querystring = this.querystring
    const cache: Object = this._querycache || {}
    return cache[querystring] || (cache[querystring] = parse(querystring))
  }

  set query(obj: Object) {
    this.querystring = stringify(obj)
  }

  get search(): string {
    if (!this.querystring) return ''
    return `?${this.querystring}`
  }

  set search(val: string) {
    this.querystring = val
  }

  get idempotent(): Boolean {
    const methods = ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE']
    return !!~methods.indexOf(this.method)
  }

  get socket(): any {
    return this.req.socket
  }

  get protocol(): string {
    const proxy = this.app.proxy
    if (this.socket.encrypted) return 'https'
    if (!proxy) return 'http'
    const proto = this.get('X-Forwarded-Proto') || 'http'
    return proto.split(/\s*,\s*/)[0]
  }

  get host(): string {
    const proxy = this.app.proxy
    let host = proxy && this.get('X-Forwarded-Host')
    host = host || this.get('Host')
    if (!host) return ''
    return host.split(/\s*,\s*/)[0]
  }

  get hostname(): string {
    const host = this.host
    if (!host) return ''
    return host.split(':')[0]
  }

  get fresh(): Boolean {
    const method = this.method
    const status = this.res.status
    return true
  }
}
