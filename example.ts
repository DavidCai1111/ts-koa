/// /// <reference path="typings/node/node.d.ts" />
'use strict'
import {Koa} from './src/application'

let app = new Koa()

app.use(async function (ctx, next) {
  ctx.body = 'hello world'
})

app.listen(3000, () => console.log('Listening at 3000'))
