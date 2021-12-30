const isOutputProxy = Symbol('__output_proxy')
const isInputProxy = Symbol('__input_proxy')

exports.recursiveProxy = (handler) => recursiveProxy(handler, isOutputProxy)

const memo = new Map()
const memo2 = new Map()

function recursiveProxy(handler, targetAccessor) {
  let newHandler = undefined

  function sanitizeInputs(input) {
    if (! (input instanceof Object)) {
      return input
    }
    if (input[isInputProxy]) {
      return input
    }
    if (!memo2.has(input)) {
        memo2.set(input, new Proxy(input, recursiveProxy({ 
      apply: (target, thisArg, argumentList) => { return Reflect.apply(target, thisArg, argumentList.map(sanitizeOutput)) }
    }, isInputProxy)))
    }
    return memo2.get(input)
  }

  function sanitizeOutput(output) {
    if (output instanceof Object) {
      if (output[isOutputProxy]) {
        return output
      }
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
      if (prop === targetAccessor) { return true }
      const value = handler.get ? handler.get(target, prop, receiver) : Reflect.get(target, prop, receiver)
      return sanitizeOutput(value)
    },
    set: (target, prop, value) => {
      const sanitized = sanitizeInputs(value)
      return handler.set ? handler.set(target, prop, sanitized) : Reflect.set(target, prop, sanitized)
    },
    defineProperty: (target, prop, desc) => {
      const newDesc = {...desc}
      if (desc.value) {
        newDesc.value = sanitizeInputs(desc.value)
      }
      if (desc.get) {
        // capture getter in closure in case desc is muted later
        const get = desc.get
        newDesc.get = function () { return sanitizeInputs(get()) }
      }
      return handler.defineProperty? handler.defineProperty(target, prop, newDesc) : Reflect.defineProperty(target, prop, newDesc)
    },
    getOwnPropertyDescriptor: (target, prop) => {
      const desc = handler.getOwnPropertyDescriptor ? handler.getOwnPropertyDescriptor(target, prop) : Reflect.getOwnPropertyDescriptor(target, prop)
      if (!desc) {
        return desc
      }
      if (!desc.hasOwnProperty('get') && !desc.hasOwnProperty('set')) {
        return {...desc, value: sanitizeOutput(desc.value) }
      }
      const newDesc = {...desc}
      if (desc.get) {
        // capture getter in closure in case desc is muted later
        const get = desc.get
        newDesc.get = function () { return sanitizeOutput(get()) }
      }
      if (desc.set) {
        const set = desc.set
        newDesc.set = function (a) { return set(sanitizeInputs(a)) }
      }
      return newDesc
    }
  }
  return newHandler
}
