"use strict"

const { INVALID_STATEFUL_OBJ } = require("./errors")
const { class:klass } = require("./class")

const { EventTarget } = require("./EventTarget")
const { ReadyStateChangeEvt } = require("./ReadyStateChangeEvt")

module.exports._states = new WeakMap
module.exports.ReadyStateFul = klass(statics => {
    const states = module.exports._states

    Object.defineProperties(statics, {
        UNINITIALIZED: { enumerable: true,
            value: 0b0
        }
      , readystateChange: { enumerable: true,
            value: (instance, to=module.exports.ReadyStateFul.UNINITIALIZED) => {
                if ( !(instance instanceof module.exports.ReadyStateFul) )
                  throw new TypeError(INVALID_STATEFUL_OBJ)

                const from = instance.readystate
                states.set(instance, to)

                if ( instance instanceof EventTarget )
                  instance.dispatchEvent(new ReadyStateChangeEvt({from, to}))
            }
        }
    })

    return {
        readystate: { enumerable: true,
            get: function(){
                if ( !states.has(this) )
                  states.set(this, module.exports.ReadyStateFul.UNINITIALIZED)

                return states.get(this)
            }
        }
    }
})
