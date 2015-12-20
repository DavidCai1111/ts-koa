'use strict'
import {EventEmitter} from 'events'
import * as http from 'http'
import * as stream from 'stream'
import {empty} from 'statuses'
import {compose} from './utils/compose'
import {Context} from './context'
import {Request} from './request'
import {Response} from './response'
import {isJSON} from './utils/isJSON'

export interface IHttpCallback {
  (req: http.IncomingMessage, res: http.ServerResponse): void
}

export interface IKoaMiddleware {
  (ctx: Context, next: Function): any
}

export interface IKoaError extends Error {
  status: number
  expose: Boolean
  code: any
}

export class Koa extends EventEmitter {
  private middlewares: Array<Function>
  public keys: Array<string> // TODO
  public subdomainOffset: number
  public proxy: Boolean
  public server: http.Server
  public env: string

  constructor() {
    super()
    this.middlewares = []
    this.subdomainOffset = 2
    this.proxy = false
    this.env = process.env.NODE_ENV || 'development'
  }

  use(middleware: IKoaMiddleware): Koa {
    this.middlewares.push(middleware)
    return this
  }

  callback(): IHttpCallback {
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

  private createContext(req: http.IncomingMessage, res: http.ServerResponse): Object {
    const context = new Context(this, req, res)
    context.onerror = context.onerror.bind(context)
    return context
  }

  private respond(ctx: Context): any {
    const res = ctx.res
    const code = ctx.res.statusCode
    let body = ctx.body

    if (empty[code]) {
      body = null
      return res.end()
    }

    if (ctx.request.method === 'HEAD') {
      if (isJSON(body)) ctx.response.length = Buffer.byteLength(JSON.stringify(body))
      return res.end()
    }

    if (body === null) {
      ctx.response.type = 'text'
      ctx.response.length = Buffer.byteLength(String(code))
      return res.end(body)
    }

    if (Buffer.isBuffer(body)) return res.end(body)
    if (typeof body === 'string') return res.end(body)

    body = JSON.stringify(body)
    ctx.response.length = Buffer.byteLength(String(code))
    res.end(body)
  }

  toJSON(): Object {
    return {
      subdomainOffset: this.subdomainOffset,
      proxy: this.proxy,
      env: this.env
    }
  }

  inspect(): Object {
    return this.toJSON()
  }

  private onerror(err: IKoaError): void {
    if (err.status === 404 || err.expose) return
    const message: string = err.stack || err.toString()
    console.error(`\n${message.replace(/^/gm, ' ')}\n`)
  }
}
