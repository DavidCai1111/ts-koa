/// <reference path="../typings/node/node.d.ts" />
'use strict'
import {EventEmitter} from 'events'
import * as http from 'http';

export class Context {
  public body: Object

  constructor(private application: EventEmitter, public req: http.IncomingMessage, public res: http.ServerResponse) {}

  onerror(err: Error) {
    this.application.emit('error', err)
  }
}
