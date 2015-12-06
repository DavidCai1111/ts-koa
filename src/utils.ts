export function compose (asyncFuncs: Array<Function>): Function {
  return (ctx: Object, next: Function): Function => {
    let index = -1

    function dispath (i: number): any {
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
