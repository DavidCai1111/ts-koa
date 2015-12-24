'use strict'
import {EventEmitter} from 'events'
import * as http from 'http'
import {Stream} from 'stream'
import {empty} from 'statuses'
import {compose} from './utils/compose'
import {koaContext, IContext} from './context'
import {koaRequest, IRequest} from './request'
import {koaResponse, IResponse} from './response'
import {isJSON} from './utils/isJSON'

const Cookies = require('cookies')
const accepts = require('accepts')
const onFinished = require('on-finished')

export class Koa extends EventEmitter {
  public keys: Array<string>
  public subdomainOffset: number
  public proxy: Boolean
  public server: http.Server
  public env: string
  public context: IContext
  public request: IRequest
  public response: IResponse
  public silent: Boolean

  private middlewares: Array<Function>

  constructor() {
    super()
    this.middlewares = []
    this.subdomainOffset = 2
    this.proxy = false
    this.silent = false
    this.env = process.env.NODE_ENV || 'development'
    this.context = Object.create(koaContext)
    this.request = Object.create(koaRequest)
    this.response = Object.create(koaResponse)
  }

  use(middleware: (ctx: IContext, next: Function) => any): Koa {
    this.middlewares.push(middleware)
    return this
  }

  callback(): (req: http.IncomingMessage, res: http.ServerResponse) => void {
    const fn = compose(this.middlewares)

    if (!this.listeners('error').length) this.on('error', this.onerror)

    return (req: http.IncomingMessage, res: http.ServerResponse): void => {
      res.statusCode = 404
      const ctx = this.createContext(req, res)
      onFinished(res, ctx.onerror)
      fn(ctx).then(() => respond(ctx)).catch(ctx.onerror)
    }
  }

  listen(port: number, callback?: Function): http.Server {
    this.server = http.createServer(this.callback())
    return this.server.listen(port, callback)
  }

  toJSON(): any {
    return {
      subdomainOffset: this.subdomainOffset,
      proxy: this.proxy,
      env: this.env
    }
  }

  inspect(): any {
    return this.toJSON()
  }

  onerror(err: any): void {
    if (err.status === 404 || err.expose) return
    if (this.silent) return
    const message: string = err.stack || err.toString()
    console.error()
    console.error(message.replace(/^/gm, '  '))
    console.error()
  }

  private createContext(req: http.IncomingMessage, res: http.ServerResponse): IContext {
    const context: IContext = Object.create(this.context)
    const request: IRequest = context.request = Object.create(this.request)
    const response: IResponse = context.response = Object.create(this.response)
    context.app = request.app = response.app = this
    context.req = request.req = response.req = req
    context.res = request.res = response.res = res
    request.ctx = response.ctx = context
    request.response = response
    response.request = request
    context.onerror = context.onerror.bind(context)
    context.originalUrl = request.originalUrl = req.url
    context.cookies = new Cookies(req, res, this.keys)
    context.accept = request.accept = accepts(req)
    context.state = {}
    return context
  }
}

function respond(ctx: IContext): any {
  'use strict'
  if (false === ctx.respond) return
  const res = ctx.res
  if (res.headersSent || !ctx.writable) return

  const code = ctx.res.statusCode
  let body = ctx.response.body

  if (empty[code]) {
    ctx.body = null
    return res.end()
  }
  if (ctx.request.method === 'HEAD') {
    if (isJSON(body)) ctx.length = Buffer.byteLength(JSON.stringify(body))
    return res.end()
  }

  if (body === null || body === undefined) {
    ctx.type = 'text'
    body = ctx.message || String(code)
    ctx.length = Buffer.byteLength(body)
    return res.end(body)
  }

  if (Buffer.isBuffer(body)) return res.end(body)
  if (typeof body === 'string') return res.end(body)
  if (body instanceof Stream) return body.pipe(res)

  body = JSON.stringify(body)
  ctx.length = Buffer.byteLength(body)
  res.end(body)
}
