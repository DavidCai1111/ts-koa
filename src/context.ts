'use strict'
import {EventEmitter} from 'events'
import * as http from 'http'
import {Request} from './request'
import {Response} from './response'
import {IKoaError, Koa} from './application'
import * as statuses from 'statuses'
const createError = require('http-errors')
const assert = require('http-assert')

export class Context {
  public body: Object
  public request: Request
  public response: Response
  public originalUrl: string
  public state: Object
  public name: string

  constructor(private application: Koa, public req: http.IncomingMessage, public res: http.ServerResponse) {
    this.request = new Request(application, req, this)
    this.response = new Response(application, res, this)
    this.originalUrl = req.url
    this.state = {}
  }

  onerror(err: IKoaError): void {
    this.application.emit('error', err)

    this.response.type = 'text'
    if (err.code === 'ENOENT') err.status = 404
    if (typeof err.code !== 'number' || !statuses[err.status]) err.status = 500
    const msg = err.expose ? err.message : statuses[err.status]
    this.response.status = err.status
    this.response.length = Buffer.byteLength(msg)
    this.res.end(msg)
  }

  toJSON(): Object {
    return {
      originalUrl: this.originalUrl,
      req: '<original node req>',
      res: '<original node res>',
      socket: '<original node socket>'
    }
  }

  inspect(): Object {
    return this.toJSON()
  }

  throw(code?: number, message?: any): void {
    throw createError.apply(null, arguments)
  }

  assert(): void {
    assert.apply(null, arguments)
  }
}
