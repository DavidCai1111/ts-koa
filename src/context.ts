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
  constructor(private application: EventEmitter, public req: http.IncomingMessage, public res: http.ServerResponse) {
    this.request = new Request(req)
    this.response = new Response(res)
    return this
  }

  onerror(err: Error) {
    this.application.emit('error', err)
  }
}
