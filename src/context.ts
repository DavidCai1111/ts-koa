'use strict'
import * as http from 'http'
import {IRequest} from './request'
import {IResponse} from './response'
import {Koa} from './application'
import * as statuses from 'statuses'
import * as createError from 'http-errors'

const delegate = require('delegates')
const assert = require('http-assert')

export interface IContext extends IRequest, IResponse {
  body?: any
  request?: IRequest
  response?: IResponse
  originalUrl?: string
  state?: any
  name?: string
  cookies?: any
  writable?: Boolean
  respond?: Boolean
  app?: Koa
  req?: http.IncomingMessage
  res?: http.ServerResponse
  onerror(err: any): void
  toJSON(): any
  inspect(): any
  throw(): void
  assert(): void
}

export const koaContext: IContext = {
  state: {},
  onerror(err) {
    if (err === null) return
    console.log('err:')
    console.log(err)
    if (!(err instanceof Error)) err = new Error(`non-error thrown: ${err}`)
    this.app.emit('error', err)

    if (this.headerSent || !this.writable) {
      err.headerSent = true
      return
    }

    this.res._headers = {}
    this.type = 'text'

    if (err.code === 'ENOENT') err.status = 404
    if (typeof err.status !== 'number' || !statuses[err.status]) err.status = 500

    const code = statuses[err.status]
    const msg = err.expose ? err.message : code
    this.status = err.status
    this.length = Buffer.byteLength(msg)
    this.res.end(msg)
  },
  toJSON() {
    return {
      request: this.request.toJSON(),
      response: this.response.toJSON(),
      originalUrl: this.originalUrl,
      req: '<original node req>',
      res: '<original node res>',
      socket: '<original node socket>'
    }
  },
  inspect() {
    return this.toJSON()
  },
  throw() {
    throw createError.apply(null, arguments)
  },
  assert: assert
}

delegate(koaContext, 'response')
  .method('attachment')
  .method('redirect')
  .method('remove')
  .method('vary')
  .method('set')
  .method('append')
  .access('status')
  .access('message')
  .access('body')
  .access('length')
  .access('type')
  .access('lastModified')
  .access('etag')
  .getter('headerSent')
  .getter('writable')

delegate(koaContext, 'request')
  .method('acceptsLanguages')
  .method('acceptsEncodings')
  .method('acceptsCharsets')
  .method('accepts')
  .method('get')
  .method('is')
  .access('querystring')
  .access('idempotent')
  .access('socket')
  .access('search')
  .access('method')
  .access('query')
  .access('path')
  .access('url')
  .getter('origin')
  .getter('href')
  .getter('subdomains')
  .getter('protocol')
  .getter('host')
  .getter('hostname')
  .getter('header')
  .getter('headers')
  .getter('secure')
  .getter('stale')
  .getter('fresh')
  .getter('ips')
  .getter('ip')
