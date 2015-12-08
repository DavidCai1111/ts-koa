'use strict'
import * as Koa from './src/index'

let app = new Koa()

app.use(function * () {
  console.log('1')
})

app.use(function * () {
  console.log(2)
})
