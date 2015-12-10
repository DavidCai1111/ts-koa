/// /// <reference path="typings/node/node.d.ts" />
'use strict'
import {Koa} from './src/application'
import * as utils from './src/utils/compose'

let app = new Koa()

let fn1 = async function (ctx, next) {
  console.log('fn1 start')
  await next()
  console.log('fn1 end')
}

let fn2 = function (ctx, next) {
  console.log('fn2 start')
  return next().then(() => {
    console.log('fn2 end')
  })
}

let fn3 = function (ctx, next) {
  console.log('fn3 start')
  console.log('fn3 end')
}

let fn = utils.compose([fn1, fn2, fn3])

fn(this).then((res) => {
  console.log(res)
  console.log('ok')
}).catch(console.error)

// Promise.resolve(fn1(this)).then(console.log)
// fn1(this).then(console.log)
// Promise.resolve().then(console.log)
