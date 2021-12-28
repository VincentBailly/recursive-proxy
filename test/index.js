const tap = require('tap')
const { recursiveProxy } = require('..')

tap.test('README exemple', t => {
  const logs = []
  const handler = {
    get: (target, prop, receiver) => {
      logs.push(`Get property "${prop}"`)
      return Reflect.get(target, prop, receiver)
    }
  }

  const recursiveHandler = recursiveProxy(handler)

  const a = new Proxy({}, recursiveHandler)

  a.b = { c: { d: 42 } }

  const foo = a.b.c.d

  t.equal(foo, 42, 'The proxies correctly return underlying data')

  t.same(logs, ['Get property "b"', 'Get property "c"', 'Get property "d"'], 'The wrapped handlers are called')
    
  t.end()
})

tap.test('get handler is not set', t => {
  const recursiveHandler = recursiveProxy({})

  const a = new Proxy({}, recursiveHandler)

  a.b = { c: { d: 42 } }

  const foo = a.b.c.d

  t.equal(foo, 42, 'The proxies correctly return underlying data')

  t.end()
})

tap.test('equality is concerved', t => {
  const recursiveHandler = recursiveProxy({})

  const a = new Proxy({}, recursiveHandler)

  a.b = { c: { d: 42 } }
  a.bb = a.b
  
  t.equal(a.b.c, a.bb.c, 'the same object is reachable from several path')

  t.end()
})

tap.test('equality is concerved when handler has a setter', t => {
  const recursiveHandler = recursiveProxy({
    set: (target, prop, value) => { return Reflect.set(target, prop, value) }
  })

  const a = new Proxy({}, recursiveHandler)

  a.b = { c: { d: 42 } }
  a.bb = a.b
  
  t.equal(a.b.c, a.bb.c, 'the same object is reachable from several path')

  t.end()
})

tap.test('return values of functions are also proxied', t => {
  const recursiveHandler = recursiveProxy({
    get: (target, prop, receiver) => {
      if (prop === '__is_proxy') {
        return true
      }
      return Reflect.get(target, prop, receiver)
    }
  })

  const a = new Proxy({}, recursiveHandler)

  a.b = { c: () => ({ foo: 'bar'}) }
  
  t.equal(a.b.c().foo, 'bar', 'objects which are function work')
  t.ok(a.b.c().__is_proxy, 'objects returned by proxied method are proxied')

  t.end()
})

tap.test('return values of functions preserve equality', t => {
  const recursiveHandler = recursiveProxy({})

  const a = new Proxy({}, recursiveHandler)

  const funcResult = { foo: 'bar'}
  a.b = { c: () => funcResult }
  a.bb = a.b
  
  t.equal(a.b.c(), a.bb.c(), 'objects returned by proxied functions preserve equality')

  t.end()
})

tap.test('return values of functions work for non-objects', t => {
  const recursiveHandler = recursiveProxy({})

  const a = new Proxy({}, recursiveHandler)

  a.b = { c: () => 'foo' }
  a.bb = a.b
  
  t.equal(a.b.c(), 'foo', 'objects returned by proxied functions work for strings')

  t.end()
})

tap.test('return values of functions preserve equality when apply is provided', t => {
  const funcResult = { foo: 'bar'}
  const recursiveHandler = recursiveProxy({
    apply: (target, thisArg, argumentList) => {
      return funcResult
    }
  })

  const a = new Proxy({}, recursiveHandler)

  a.b = { c: ()=>{} }
  a.bb = a.b
  
  t.equal(a.b.c().foo, 'bar', 'the apply method is used when provided')
  t.equal(a.b.c(), a.bb.c(), 'objects returned by proxied functions preserve equality when apply is provided')

  t.end()
})

tap.test('callback params are proxied', t => {
  const recursiveHandler = recursiveProxy({
    get: (target, prop, receiver) => {
      if (prop === '__is_proxy') {
        return true
      }
      return Reflect.get(target, prop, receiver)
    }
  })

  const a = new Proxy({}, recursiveHandler)

  const callbackArg = { foo: 'bar'}
  a.b = { c: (callback) => { callback(callbackArg, 32) } }

  let callbackParam = undefined
  a.b.c((v, b) => { callbackParam = v }, 42)
  
  t.ok(callbackParam.__is_proxy, 'callback parameters should be proxies')
  t.equal(callbackParam.foo, 'bar', 'callback parameters should be proxies')

  a.bb = a.b
  let callbackParam2 = undefined
  a.bb.c((v, b) => { callbackParam2 = v }, 42)

  t.equal(callbackParam, callbackParam2, 'the proxying of the callback args concerves equality')

  t.end()
})

tap.test('convoluted callback params are proxied', t => {
  const recursiveHandler = recursiveProxy({
    get: (target, prop, receiver) => {
      if (prop === '__is_proxy') {
        return true
      }
      return Reflect.get(target, prop, receiver)
    }
  })

  const a = new Proxy({}, recursiveHandler)

  const callbackArg = { foo: 'bar'}
  a.b = { c: (callbackSetter) => { callbackSetter(callback => callback(callbackArg, 32)) } }

  let callbackParam = undefined
  a.b.c((f) => f((v, b) => { callbackParam = v }, 42))
  
  t.ok(callbackParam.__is_proxy, 'callback parameters should be proxies')
  t.equal(callbackParam.foo, 'bar', 'callback parameters should be proxies')

  a.bb = a.b
  let callbackParam2 = undefined
  a.bb.c((f) => f((v, b) => { callbackParam2 = v }, 42))

  t.equal(callbackParam, callbackParam2, 'the proxying of the callback args concerves equality')

  t.end()
})

tap.test('callback params are proxied when callback is set via a setter', t => {
  const recursiveHandler = recursiveProxy({
    get: (target, prop, receiver) => {
      if (prop === '__is_proxy') {
        return true
      }
      return Reflect.get(target, prop, receiver)
    }
  })

  const a = new Proxy({}, recursiveHandler)

  const callbackArg = { foo: 'bar'}
  a.b = { c: function () { this.c.callback(callbackArg, 32) } }

  let callbackParam = undefined
  a.b.c.callback = (v, b) => { callbackParam = v }
  a.b.c()
  
  t.ok(callbackParam.__is_proxy, 'callback parameters should be proxies')
  t.equal(callbackParam.foo, 'bar', 'callback parameters should be proxies')

  t.end()
})

tap.test(`the functions being wrapped don't loose there properties`, t => {
  const recursiveHandler = recursiveProxy({
    get: (target, prop, receiver) => {
      if (prop === '__is_proxy') {
        return true
      }
      return Reflect.get(target, prop, receiver)
    }
  })

  const a = new Proxy({}, recursiveHandler)
  // call the callback passing it its own foo property as arg
  a.b = (cb) => cb(cb.foo)

  let callbackParam = undefined
  const callback = function (arg) { callbackParam = arg } 
  callback.foo = 'bar'

  a.b(callback)
  t.equal(callbackParam, 'bar', `callbacks don't loose there properties`)

  t.end()
})
