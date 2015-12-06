/// <reference path="../typings/node/node.d.ts" />
import events = require('events')
import http = require('http')
import utils = require('./utils')

class Koa extends events.EventEmitter {
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
    return this.server.listen(port, callback = noop)
  }
}

function noop (): void {}

module.exports = Koa
