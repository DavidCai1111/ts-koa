'use strict'
import {IncomingMessage, ServerResponse} from 'http'
import {format} from 'url'
import {Koa} from './application'
import {IContext} from './context'
import {IResponse} from './response';
const qs = require('parseurl')
const fresh = require('fresh')
const contentType = require('content-type')
const accepts = require('accepts')
const typeis = require('type-is')

const parse = qs.parse
const stringify = qs.stringify

export interface IRequest {
  _querycache?: string
  app?: Koa
  req?: IncomingMessage
  res?: ServerResponse
  response?: IResponse
  ctx?: IContext
  headers?: any
  header?: any
  method?: string
  length?: any
  url?: string
  origin?: string
  originalUrl?: string
  href?: string
  path?: string
  querystring?: string
  query?: any
  search?: string
  idempotent?: Boolean
  socket?: any
  protocol?: string
  host?: string
  hostname?: string
  fresh?: Boolean
  stale?: Boolean
  charset?: string
  secure?: Boolean
  ips?: Array<string>
  ip?: string
  subdomains?: Array<string>
  accept?: any
  type?: string
  accepts?: () => any
  acceptsEncodings?: () => any
  acceptsCharsets?: () => any
  acceptsLanguages?: () => any
  is?: (types: any) => any
  toJSON?: () => any
  inspect?: () => any
  get?: (field: string) => string
}

export const koaRequest: IRequest = {
  get(field: string): string {
    const req = this.req
    switch (field = field.toLowerCase()) {
      case 'referer':
      case 'referrer':
        return req.headers.referrer || req.headers.referer || ''
      default:
        return req.headers[field] || ''
    }
  },
  get headers(): any {
    return this.req.headers
  },
  get header(): any {
    return this.req.headers
  },
  get method(): string {
    return this.req.method
  },
  set method(method: string) {
    this.req.method = method
  },
  get length(): any {
    const len = this.get('Content-Length')
    if (len === '') return
    return ~~len
  },
  get url(): string {
    return this.req.url
  },
  set url(val: string) {
    this.req.url = val
  },
  get origin(): string {
    return `${this.protocol}://${this.host}`
  },
  get originalUrl(): string {
    return this.req.url
  },
  get href(): string {
    if (/^https?:\/\//i.test(this.originalUrl)) return this.originalUrl
    return `${this.origin}${this.originalUrl}`
  },
  get path(): string {
    return parse(this.req).pathname
  },
  set path(val: string) {
    const url: any = parse(this.req)
    if (url.pathname === val) return
    url.pathname = val
    url.path = null
  },
  get querystring(): string {
    if (!this.req) return ''
    return parse(this.req).query || ''
  },
  set querystring(val: string) {
    const url: any = parse(this.req)
    if (url.search === `?${val}`) return
    url.search = val
    url.path = null

    this.url = format(url)
  },
  get query(): any {
    const querystring = this.querystring
    const cache: Object = this._querycache || {}
    return cache[querystring] || (cache[querystring] = parse(querystring))
  },
  set query(obj: any) {
    this.querystring = stringify(obj)
  },
  get search(): string {
    if (!this.querystring) return ''
    return `?${this.querystring}`
  },
  set search(val: string) {
    this.querystring = val
  },
  get idempotent(): Boolean {
    const methods = ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE']
    return !!~methods.indexOf(this.method)
  },
  get socket(): any {
    return this.req.socket
  },
  get protocol(): string {
    const proxy = this.app.proxy
    if (this.socket.encrypted) return 'https'
    if (!proxy) return 'http'
    const proto = this.get('X-Forwarded-Proto') || 'http'
    return proto.split(/\s*,\s*/)[0]
  },
  get host(): string {
    const proxy = this.app.proxy
    let host = proxy && this.get('X-Forwarded-Host')
    host = host || this.get('Host')
    if (!host) return ''
    return host.split(/\s*,\s*/)[0]
  },
  get hostname(): string {
    const host = this.host
    if (!host) return ''
    return host.split(':')[0]
  },
  get fresh(): Boolean {
    const method = this.method
    const status = this.ctx.response.status

    // GET or HEAD for weak freshness validation only
    if ('GET' !== method && 'HEAD' !== method) return false

    // 2xx or 304 as per rfc2616 14.26
    if ((status >= 200 && status < 300) || 304 === status) {
      return fresh(this.header, this.ctx.response.header)
    }

    return false
  },
  get stale(): Boolean {
    return !this.fresh
  },
  get charset(): string {
    const type = this.get('Content-Type')
    if (!type) return ''
    return contentType.parse(type).parameters.charset || ''
  },
  get secure(): Boolean {
    return this.protocol === 'https'
  },
  get ips(): Array<string> {
    const proxy = this.app.proxy
    const val = this.get('X-Forwarded-For')
    return proxy && val
      ? val.split(/\s*,\s*/)
      : []
  },
  get ip(): string {
    return this.ips[0] || this.socket.remoteAddress || ''
  },
  get subdomains(): Array<string> {
    const offset = this.app.subdomainOffset
    return (this.host || '')
      .split('.')
      .reverse()
      .slice(offset)
  },
  get accept(): any {
    return accepts(this.req)
  },
  get type(): string {
    const type = this.get('Content-Type')
    if (!type) return ''
    return type.split(';')[0]
  },
  accepts: () => {
    return this.accept.types.apply(this.accept, arguments)
  },
  acceptsEncodings: () => {
    return this.accept.encodings.apply(this.accept, arguments);
  },
  acceptsCharsets: () => {
    return this.accept.charsets.apply(this.accept, arguments);
  },
  acceptsLanguages: () => {
    return this.accept.languages.apply(this.accept, arguments);
  },
  is: (types: any) => {
    if (!types) return typeis(this.req)
    if (!Array.isArray(types)) types = [].slice.call(arguments)
    return typeis(this.req, types)
  },
  toJSON: () => {
    return {
      method: this.method,
      url: this.url,
      header: this.header
    }
  },
  inspect: () => {
    if (!this.req) return
    return this.toJSON()
  }
}
