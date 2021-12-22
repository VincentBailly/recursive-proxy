# recursive-proxy

## Description

recursive-proxy helps create a proxy object with attribute getters
which return a proxy of the object they would normally return.

## Usage

```javascript
const { recursiveProxy } = require('recursive-proxy')

const handler = {
  get: (target, prop, receiver) => {
    console.log(`Get property "${prop}"`)
    return Reflect.get(target, prop, receiver)
  }
}

const recursiveHandler = recursiveProxy(handler)

const a = new Proxy({}, recursiveHandler)

a.b = { c: { d: 42 } }

const foo = a.b.c.d
// log: Get property "b"
// log: Get property "c"
// log: Get property "d"
// foo = 42

```
## Details

This library aimes at providing a proxy object which will proxy any object extracted from it by any means.

Progress:
- proxy values extracted with get() [Done]
- proxy values extracted from apply() [Done]
- proxy values extracted using a callback passed to apply() [Done]
- proxy values extracted using a callback passed to set() [Done]

- proxy values extracted from the constructor
- proxy values extracted using a callback passed to the constructor
- proxy values extracted using a callback passed through defineProperty()
- proxy values extracted from getOwnPropertyDescriptor()
- proxy values extracted from getPrototypeOf()
- proxy values extracted using a callback passed through setPrototypeOf()



```
