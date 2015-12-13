/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/statuses/statuses.d.ts" />
'use strict'
import {EventEmitter} from 'events'
import * as http from 'http'
import {empty} from 'statuses'
import {compose} from './utils/compose'
import {Context} from './context'
import {Request} from './request'
import {Response} from './response'

export class Koa extends EventEmitter {
  private middlewares: Array<Function>
  private server: http.Server

  constructor() {
    super()
    this.middlewares = []
  }

  use(middleware: Function): Koa {
    this.middlewares.push(middleware)
    return this
  }

  callback(): any {
    const fn = compose(this.middlewares)
    return (req: http.IncomingMessage, res: http.ServerResponse): void => {
      res.statusCode = 404
      const ctx = new Context(this, req, res)
      fn(ctx).then(() => this.respond(ctx)).catch(ctx.onerror)
    }
  }

  listen(port: number, callback?: Function): http.Server {
    this.server = http.createServer(this.callback())
    return this.server.listen(port, callback)
  }

  respond(ctx: Context): void {
    const res = ctx.res
    const statusCode = ctx.res.statusCode
    if (empty[statusCode]) {
      ctx.body = null
      res.end()
    }

    ctx.body = JSON.stringify(ctx.body)
    res.end(ctx.body)
  }
}
