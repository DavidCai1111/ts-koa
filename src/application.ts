'use strict'
import {EventEmitter} from 'events'
import * as http from 'http'
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

  private middlewares: Array<Function>

  constructor() {
    super()
    this.middlewares = []
    this.subdomainOffset = 2
    this.proxy = false
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
    const message: string = err.stack || err.toString()
    console.error(`\n${message.replace(/^/gm, ' ')}\n`)
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
    context.originalUrl = request.originalUrl = req.url
    context.cookies = new Cookies(req, res, this.keys)
    context.accept = request.accept = accepts(req)
    context.state = {}
    context.onerror = context.onerror.bind(context)
    return context
  }
}

function respond(ctx: IContext): any {
  'use strict'
  const res = ctx.res
  const code = ctx.res.statusCode
  if (res.headersSent) return
  let body = ctx.response.body
  if (empty[code]) {
    body = null
    return res.end()
  }
  if (ctx.request.method === 'HEAD') {
    if (isJSON(body)) ctx.length = Buffer.byteLength(JSON.stringify(body))
    return res.end()
  }

  if (body === null) {
    ctx.type = 'text'
    body = ctx.message || String(code)
    ctx.length = Buffer.byteLength(String(code))
    return res.end(body)
  }

  if (Buffer.isBuffer(body)) return res.end(body)
  if (typeof body === 'string') return res.end(body)
  body = JSON.stringify(body)
  ctx.length = Buffer.byteLength(String(code))
  res.end(body)
}
