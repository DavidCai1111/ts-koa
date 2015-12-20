'use strict'
import {EventEmitter} from 'events'
import * as http from 'http'
import {Request} from './request'
import {Response} from './response'
import * as statuses from 'statuses'
const createError = require('http-errors')
const assert = require('http-assert')

export class Context {
  public body: Object
  public request: Request
  public response: Response
  public originalUrl: string
  public state: Object

  constructor(private application: EventEmitter, public req: http.IncomingMessage, public res: http.ServerResponse) {
    this.request = new Request(req)
    this.response = new Response(res)
    this.originalUrl = req.url
    this.state = {}
    return this
  }

  onerror(err: any) {
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

  throw(): void {
    throw createError.apply(null, arguments)
  }

  assert():void {
    assert.apply(null, arguments)
  }
}
