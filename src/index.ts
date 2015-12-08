/// <reference path="../typings/node/node.d.ts" />
import * as utils from './utils'
import {EventEmitter} from 'events'
import * as http from 'http'

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
    const fn = utils.compose(this.middlewares)
    return (req: http.IncomingMessage, res: http.ServerResponse): void => {
      fn(req, res)
    }
  }

  listen(port: number, callback?: Function): http.Server {
    this.server = http.createServer(this.callback())
    return this.server.listen(port, callback)
  }
}