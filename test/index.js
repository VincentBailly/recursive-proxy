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

  const a = new Proxy({b: { c: { d: 42 } } }, recursiveHandler)

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

  const o = a.b.c()
  
  t.equal(o.foo, 'bar', 'objects which are function work')
  t.ok(o.__is_proxy, 'objects returned by proxied method are proxied')

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

  const o = {}
  const callbackArg = { foo: 'bar'}
  o.b = { c: function () { this.c.callback(callbackArg, 32) } }

  const a = new Proxy(o, recursiveHandler)

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

tap.test(`value returned by constructor is wrapped`, t => {
  const recursiveHandler = recursiveProxy({
    get: (target, prop, receiver) => {
      if (prop === '__is_proxy') {
        return true
      }
      return Reflect.get(target, prop, receiver)
    }
  })

  const a = new Proxy({}, recursiveHandler)

  a.b = function() { return { foo: 'bar' } }

  t.equal((new a.b()).foo, 'bar', 'constructor returns expected object')
  t.ok((new a.b()).__is_proxy, 'constructor returns a proxy')

  t.end()
})

tap.test(`constructor in input handler is wrapped`, t => {
  const recursiveHandler = recursiveProxy({
    construct: (target, argumentList) => {
      return { foo: 'baz' }
    }
  })

  const a = new Proxy({}, recursiveHandler)

  a.b = function() { return { foo: 'bar' } }

  t.equal((new a.b()).foo, 'baz', 'constructor returns the object overriden by the handler given as input')

  t.end()
})

tap.test(`arguments extracted through a callback passed to constructor are proxied`, t => {
  const recursiveHandler = recursiveProxy({
    get: (target, prop, receiver) => {
      if (prop === '__is_proxy') {
        return true
      }
      return Reflect.get(target, prop, receiver)
    }
  })

  const a = new Proxy({}, recursiveHandler)

  a.b = function(callback) { callback({ foo: 'bar'}) }

  let constructorArg = undefined
  new a.b(arg => { constructorArg = arg })

  t.equal(constructorArg.foo, 'bar', 'constructor args are correctly passed')
  t.ok(constructorArg.__is_proxy, 'constructor args are proxied')

  t.end()
})

tap.test('iterable are correctly proxied', t => {
  
  const recursiveHandler = recursiveProxy({
    get: (target, prop, receiver) => {
      if (prop === '__is_proxy') {
        return true
      }
      return Reflect.get(target, prop, receiver)
    }
  })

  // We implement our own iterator because array need some extra magic to work with proxies
  const it = {
    [Symbol.iterator]: () => {
      let i = 0
      return {
        next: () => {
          i++
          if (i === 1) { return { done: false, value: { a: 1 } } }
          if (i === 2) { return { done: false, value: { b: 'foo' } } }
          if (i === 3) { return { done: false, value: { c: 42 } } }
          return { done: true }
        }
      }
    }
  }

  const a = new Proxy(it, recursiveHandler)

  const extractedValues = []
  for (const el of a) {
    extractedValues.push(el)
    t.ok(el.__is_proxy, `array element ${el} is proxied`) 
  }
  t.equal(extractedValues[0].a, 1, 'first array element is correctly proxied')
  t.equal(extractedValues[1].b, 'foo', 'first array element is correctly proxied')
  t.equal(extractedValues[2].c, 42, 'first array element is correctly proxied')
  t.end()
})

tap.test('this arg is proxied', t => {
  
  const recursiveHandler = recursiveProxy({
    get: (target, prop, receiver) => {
      if (prop === '__is_proxy') {
        return true
      }
      return Reflect.get(target, prop, receiver)
    }
  })

  const o = {
    foo: 'bar',
  }
  const a = new Proxy(o, recursiveHandler)
  
  let thisArg = undefined
  a.b = function () { thisArg = this }
  a.b()

  t.equal(thisArg.foo, 'bar', 'this arg is correctly passed')
  t.ok(thisArg.__is_proxy, 'this arg is proxied')

  t.end()
})

tap.test('values extracted by a callback set using Object.defineProperty() are proxied', t => {
  const recursiveHandler = recursiveProxy({
    get: (target, prop, receiver) => {
      if (prop === '__is_proxy') {
        return true
      }
      return Reflect.get(target, prop, receiver)
    }
  })

  const o = {
    f() {
      this.callback({ foo: 'bar' })
    }
  }

  const a = new Proxy(o, recursiveHandler)

  let callbackParam = undefined
  // Note that we get an exception if we try to proxy non-configurable and read-only properties
  // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/get#invariants
  Object.defineProperty(a, 'callback', { value: (arg) => { callbackParam = arg }, writable: true })
  a.f()
  
  t.ok(callbackParam.__is_proxy, 'callback parameters should be proxies')
  t.equal(callbackParam.foo, 'bar', 'callback parameters should be proxies')

  t.end()
})

tap.test('values extracted by a callback set using Object.defineProperty() are proxied (when handler has a defineProperty callback)', t => {
  const recursiveHandler = recursiveProxy({
    get: (target, prop, receiver) => {
      if (prop === '__is_proxy') {
        return true
      }
      return Reflect.get(target, prop, receiver)
    },
    defineProperty: (target, prop, desc) => {
      return Reflect.defineProperty(target, prop, desc)
    }
  })

  const o = {
    f() {
      this.callback({ foo: 'bar' })
    }
  }

  const a = new Proxy(o, recursiveHandler)

  let callbackParam = undefined
  // Note that we get an exception if we try to proxy non-configurable and read-only properties
  // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/get#invariants
  Object.defineProperty(a, 'callback', { value: (arg) => { callbackParam = arg }, writable: true })
  a.f()
  
  t.ok(callbackParam.__is_proxy, 'callback parameters should be proxies')
  t.equal(callbackParam.foo, 'bar', 'callback parameters should be proxies')

  t.end()
})

tap.test('values extracted by a callback set using Object.defineProperty() are proxied (when prop has a getter)', t => {
  const recursiveHandler = recursiveProxy({
    get: (target, prop, receiver) => {
      if (prop === '__is_proxy') {
        return true
      }
      return Reflect.get(target, prop, receiver)
    }
  })

  const o = {
    f() {
      this.callback({ foo: 'bar' })
    }
  }

  const a = new Proxy(o, recursiveHandler)

  let callbackParam = undefined
  // Note that we get an exception if we try to proxy non-configurable properties with a getter
  // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/get#invariants
  Object.defineProperty(a, 'callback', { configurable: true, get: () => (arg) => { callbackParam = arg } })
  a.f()
  
  t.ok(callbackParam.__is_proxy, 'callback parameters should be proxies')
  t.equal(callbackParam.foo, 'bar', 'callback parameters should be proxies')

  t.end()
})

tap.test('values extracted with getOwnPropretyDescriptor are proxied', t => {
  const recursiveHandler = recursiveProxy({
    get: (target, prop, receiver) => {
      if (prop === '__is_proxy') {
        return true
      }
      return Reflect.get(target, prop, receiver)
    }
  })

  const o = { prop: { foo: 'bar' } }
  const a = new Proxy(o, recursiveHandler)
  
  const p = Object.getOwnPropertyDescriptor(a, 'prop').value

  t.equal(p.foo, 'bar', 'property values are accessible')
  t.ok(p.__is_proxy, 'property values are proxied')

  t.end()
})

tap.test('values extracted with getOwnPropretyDescriptors are proxied', t => {
  const recursiveHandler = recursiveProxy({
    get: (target, prop, receiver) => {
      if (prop === '__is_proxy') {
        return true
      }
      return Reflect.get(target, prop, receiver)
    }
  })

  const o = { prop: { foo: 'bar' } }
  const a = new Proxy(o, recursiveHandler)
  
  const p = Object.getOwnPropertyDescriptors(a)['prop'].value

  t.equal(p.foo, 'bar', 'property values are accessible')
  t.ok(p.__is_proxy, 'property values are proxied')

  t.end()
})

tap.test('values extracted with getOwnPropretyDescriptor are proxied (when handler has a property getter trap', t => {
  const recursiveHandler = recursiveProxy({
    get: (target, prop, receiver) => {
      if (prop === '__is_proxy') {
        return true
      }
      return Reflect.get(target, prop, receiver)
    },
    getOwnPropertyDescriptor: (target, prop) => {
      return Reflect.getOwnPropertyDescriptor(target, prop)
    }
  })

  const o = { prop: { foo: 'bar' } }
  const a = new Proxy(o, recursiveHandler)
  
  const p = Object.getOwnPropertyDescriptor(a, 'prop').value

  t.equal(p.foo, 'bar', 'property values are accessible')
  t.ok(p.__is_proxy, 'property values are proxied')

  t.end()
})

tap.test('values extracted with getOwnPropretyDescriptor are proxied (when proprety has a getter)', t => {
  const recursiveHandler = recursiveProxy({
    get: (target, prop, receiver) => {
      if (prop === '__is_proxy') {
        return true
      }
      return Reflect.get(target, prop, receiver)
    }
  })

  const o = { get prop() { return { foo: 'bar' } } }
  const a = new Proxy(o, recursiveHandler)
  
  const p = Object.getOwnPropertyDescriptor(a, 'prop').get()

  t.equal(p.foo, 'bar', 'property values are accessible')
  t.ok(p.__is_proxy, 'property values are proxied')

  t.end()
})

tap.test('values extracted by a callback set using the setter of a property descriptor are proxied', t => {
  const recursiveHandler = recursiveProxy({
    get: (target, prop, receiver) => {
      if (prop === '__is_proxy') {
        return true
      }
      return Reflect.get(target, prop, receiver)
    }
  })

  const o = {
    set callback(c) {
      c({foo: 'bar'})
    }
  }

  const a = new Proxy(o, recursiveHandler)

  let callbackParam = undefined
  Object.getOwnPropertyDescriptor(a, 'callback').set(a => { callbackParam = a })
  
  t.ok(callbackParam.__is_proxy, 'callback parameters should be proxies')
  t.equal(callbackParam.foo, 'bar', 'callback parameters should be proxies')

  t.end()
})

tap.test('values extracted with getPrototypeOf are proxied', t => {
  const recursiveHandler = recursiveProxy({
    get: (target, prop, receiver) => {
      if (prop === '__is_proxy') {
        return true
      }
      return Reflect.get(target, prop, receiver)
    }
  })

  const o = Object.create({ foo: 'bar' })
  const a = new Proxy(o, recursiveHandler)
  
  const p = Object.getPrototypeOf(a)

  t.equal(p.foo, 'bar', 'property values are accessible')
  t.ok(p.__is_proxy, 'property values are proxied')

  t.end()
})
