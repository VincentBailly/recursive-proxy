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




```
