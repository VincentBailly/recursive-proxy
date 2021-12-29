exports.recursiveProxy = recursiveProxy

const memo = new Map()

function recursiveProxy(handler) {
  let newHandler = undefined

  function sanitizeInputs(input) {
    const i = input instanceof Object && input.__proxy_target ? input.__proxy_target : input
    if (i instanceof Function) {
      return new Proxy(i, { 
        apply: (target, thisArg, argumentList) => { Reflect.apply(target, thisArg, argumentList.map(sanitizeOutput)) }
      })
    }
    return i
  }

  function sanitizeOutput(output) {
    if (output instanceof Object) {
      if (!memo.has(output)) {
        memo.set(output, new Proxy(output, newHandler))
      }
      return memo.get(output)
    }
    return output
  }

  newHandler = {
    ...handler,
    apply: (target, thisArg, argumentList) => {
      const newArgList = argumentList.map(sanitizeInputs)
      const value = handler.apply ? handler.apply(target, thisArg, newArgList) : Reflect.apply(target, thisArg, newArgList)
      return sanitizeOutput(value)
    },
    construct: (target, argumentList) => {
      const newArgList = argumentList.map(sanitizeInputs)
      const value = handler.construct ? handler.construct(target, newArgList) : Reflect.construct(target, newArgList)
      return sanitizeOutput(value)
    },
    get: (target, prop, receiver) => {
      if (prop === '__proxy_target') { return target }
      const value = handler.get ? handler.get(target, prop, receiver) : Reflect.get(target, prop, receiver)
      return sanitizeOutput(value)
    },
    set: (target, prop, value) => {
      const sanitized = sanitizeInputs(value)
      return handler.set ? handler.set(target, prop, sanitized) : Reflect.set(target, prop, sanitized)
    },
    defineProperty: (target, prop, desc) => {
      if (desc.value) {
        desc.value = sanitizeInputs(desc.value)
      }
      if (desc.get) {
        const originalGetter = desc.get
        desc.get = () => sanitizeInputs(originalGetter())
      }
      return handler.defineProperty? handler.defineProperty(target, prop, desc) : Reflect.defineProperty(target, prop, desc)
    }
  }
  return newHandler
}
