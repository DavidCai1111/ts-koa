export function compose (asyncFuncs: Array<Function>): Function {
  'use strict'
  return (ctx: any, next: Function): Function => {
    let index = -1

    function dispath (i: number): any {
      if (i <= index) return Promise.reject(new Error('next() called mutipule times'))
      index = i
      const asyncFun = asyncFuncs[i] || next
      if (!asyncFun) return Promise.resolve()
      try {
        return Promise.resolve(asyncFun(ctx, () => {
          return dispath(i + 1)
        }))
      } catch (err) {
        return Promise.reject(err)
      }
    }

    return dispath(0)
  }
}
