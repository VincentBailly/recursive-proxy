exports.recursiveProxy = recursiveProxy

const memo = new Map()

function recursiveProxy(handler) {
  const newHandler = {
    ...handler,
    apply: (target, thisArg, argumentList) => {
      debugger
      const newArgList = argumentList.map(a => {
        if (a instanceof Function) {
          return function (...args) {
            return a(...args.map(arg => {
              if (arg instanceof Object) {
                if (!memo.has(arg)) {
                  memo.set(arg, new Proxy(arg, newHandler))
                }
                return memo.get(arg)
              }
              return arg
            }))
          }
        }
        return a
      })
      const value = handler.apply ? handler.apply(target, thisArg, newArgList) : Reflect.apply(target, thisArg, newArgList)
      if (value instanceof Object) {
        if (!memo.has(value)) {
          memo.set(value, new Proxy(value, newHandler))
        }
        return memo.get(value)
      }
      return value
    },
    get: (target, prop, receiver) => {
      if (prop === '__proxy_target') { return target }
      const value = handler.get ? handler.get(target, prop, receiver) : Reflect.get(target, prop, receiver)
      if (value instanceof Object) {
        if (!memo.has(value)) {
          memo.set(value, new Proxy(value, newHandler))
        }
        return memo.get(value)
      }
      return value
    },
    set: (target, prop, value) => {
      const unwrapped = value instanceof Object && value.__proxy_target ? value.__proxy_target : value
      return handler.set ? handler.set(target, prop, unwrapped) : Reflect.set(target, prop, unwrapped)
    }
  }
  return newHandler
}
