# recursive-proxy-handler

## Description

recursive-proxy-handler helps create a proxy object with attribute getters
which return a proxy of the objects they would normally return.

This library simply decorates the given proxy handler so that it is easy to compose
it with other "proxy-handler enhancers".

## Usage

```javascript
const { recursiveProxyHandler } = require('recursive-proxy-handler')

const handler = {
  get: (target, prop, receiver) => {
    console.log(`Get property "${prop}"`)
    return Reflect.get(target, prop, receiver)
  }
}

const recursiveHandler = recursiveProxyHandler(handler)
 
const obj = { b: { c: { d: 42 } } }

const a = new Proxy(obj, recursiveHandler)

const foo = a.b.c.d
// log: Get property "b"
// log: Get property "c"
// log: Get property "d"
// foo = 42

```
## Details

This library aimes at providing a proxy object which will proxy any object extracted from it by any means.

Another way to expain this the aim of this library is the following:

```
Mary is the implementer of a JavaScript object "obj"
Bob wraps "obj" using this library and passes the wrapped object to Paul.
Paul can do whatever he wants with the object.

Bob has the means to intercept, modify or inspect any values passed from Mary to Paul through "obj".
```
This metaphor has its limits (Mary and Paul can use cryptography to avoid the "man in the middle attack" from Bob), but hopefully it helps concey the intent of this library.

A concrete usage of this library is to monitor all the effects that some code has on a given object.
It can be useful to understand better what a given function does (eg. which properties of the input are read or modified).

This library could also be used to make an object deeply immutable.

Progress:
- proxy values extracted with get() [Done]
- proxy values extracted from apply() [Done]
- proxy values extracted using a callback passed to apply() [Done]
- proxy values extracted using a callback passed to set() [Done]
- proxy values extracted from the constructor [Done]
- proxy values extracted using a callback passed to the constructor [Done]

- proxy values extracted using a callback passed through defineProperty()
- proxy values extracted from getOwnPropertyDescriptor()
- proxy values extracted from getPrototypeOf()
- proxy values extracted using a callback passed through setPrototypeOf()
- proxy values extracted from property getters
- proxy values extracted using a callback passed through property setters
- proxy all values returned by generators
- proxy all values returned by iterators
- proxy global object
- proxy require()

