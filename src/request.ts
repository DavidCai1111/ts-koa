/// <reference path="../typings/node/node.d.ts" />
'use strict'
import {IncomingMessage} from 'http'
const parse = require('parseurl').parse

export class Request {
  public request: Object
  constructor(public req: IncomingMessage) {}

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

  get originalUrl(): string {
    return this.req.url
  }

  get path(): string {
    return parse(this.req).pathname
  }

  set path(val: string) {
    const url = parse(this.req)
    if (url.pathname === val) return
    url.pathname = val
    url.path = null
  }
}
