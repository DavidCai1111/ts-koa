/// <reference path="../typings/node/node.d.ts" />
'use strict'
import {EventEmitter} from 'events'
import * as http from 'http'
import {Request} from './request'
import {Response} from './response'

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

  onerror(err: Error) {
    this.application.emit('error', err)
  }
}
