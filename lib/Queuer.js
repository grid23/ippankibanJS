"use strict"

const { class:klass } = require("./class")

const { Node } = require("./Node")
const { ReadyStateFul } = require("./ReadyStateFul")

module.exports.Queuer = klass(Node, ReadyStateFul, statics => {
    const queuers = new WeakMap

    Object.defineProperties(statics, {
        UNINITIALIZED: { enumerable: true, value: 0b0 }
      , [0b0]: { enumerable: true, value: "UNINITIALIZED"}
      , INITIALIZING: { enumerable: true, value: 0b1 }
      , [0b1]: { enumerable: true, value: "INITIALIZING" }

      , FREE: { enumerable: true, value: 0b11 }
      , [0b11]: { enumerable: true, value: "FREE" }
      , FULL: { enumerable: true, value: 0b100 }
      , [0b100]: { enumerable: true, value: "FULL" }

      , DEF_SIZE: { enumerable: true, value: 10 }
    })

    const slotproxy = {
        get: (o, p) => {
            return o[p]
        }
    }

    return {
        constructor: function({ size }={}){
            Reflect.apply(this, Node, [])
            queuers.set(this, new Map)

            if ( size ) queuers.get(this).set("size", parseInt(size, 10))

            queuers.get(this).set("ready", Promise.resolve()
              .then(slots => new Promise(resolve => nextTick(() => {
                  ReadyStateFul.readystateChange(this, module.exports.UnixSocket.INITIALIZING)
                  resolve()
              })))
              .then(() => new Promise(resolve => {

              })))

        }
      , size: { enumerable: true,
            get: function(){ return queuers.get(this).get("size") || module.exports.Queuer.DEF_SIZE }
        }
      , slot: { enumerable: true,
            value: function(){
                if ( !queuers.get(this).has("slotproxy") )
                  queuers.get(this).set("slotproxy", new Proxy(this, slotproxy))

                return queuers.get(this).get("slotproxy")
            }
        }
      , slots: { enumerable: true,
            get: function(){}
        }
      , queue: { enumerable: true,
            value: function(){

            }
        }
    }

})
