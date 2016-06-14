"use strict"

const error = require("./errors")
const klass = require("./class").class
const typeOf = require("./type").type

module.exports._eventWM = new WeakMap

module.exports.Event = klass(statics => {
    const events = module.exports._eventWM

    Object.defineProperties(statics, {
        UNINITIALIZED: { enumerable: true, value: 0 }
      , INITIALIZED: { enumerable: true, value: 1 }
      , PAUSED: { enumerable: true, value: 2 }
      , STOPPED: { enumerable: true, value: 3 }
    })

    return {
        constructor: function(type, detail){
            events.set(this, Object.create(null))
            events.get(this).type = typeOf(type) == "string" ? type : function(){ throw new TypeError(errors.UNSPECIFIED_EVENT_TYPE_ERR) }()
            events.get(this).detail = typeOf(detail) == "object" ? (detail.hasOwnProperty(detail) ? detail.detail : detail)
                                    : detail && detail.length == 1 ? detail[0]
                                    : detail && detail.length > 1 ? [].concat(detail)
                                    : null
            events.get(this).timestamp = Date.now()
            events.get(this).state = module.exports.Event.INITIALIZED
            events.get(this).bubbles = detail && Object.prototype.hasOwnProperty.call(detail, "bubbles") ? detail.bubbles : true
            events.get(this).cancelable = detail && Object.prototype.hasOwnProperty.call(detail, "cancelable") ? detail.cancelable : true
        }
      , bubbles: { enumerable: true,
            get: function(){ return !!events.get(this).bubbles }
        }
      , cancelable: { enumerable: true,
            get: function(){ return !!events.get(this).cancelable }
        }
      , detail: { enumerable: true,
            get: function(){ return events.get(this).detail }
        }
      , timestamp: { enumerable: true,
            get: function(){ return events.get(this).timestamp }
        }
      , state: { enumerable: true,
            get: function(){ return events.get(this).state || module.exports.Event }
        }
      , stop: { enumerable: true,
            value: function(){
                events.get(this).state = module.exports.Event.STOPPED
            }
        }
      , target: { enumerable: true,
            get: function(){
                return events.get(this).target
            }
        }
      , type: { enumerable: true,
            get: function(){ return events.get(this).type }
        }
      , wait: { enumerable: true,
            value: function(fn){
                if ( typeOf(fn) == "function" )
                  events.get(this).state = module.exports.Event.PAUSED,
                  events.get(this).waitFor = new Promise(resolve => { fn(resolve) })
                    .then(()=>{
                        events.get(this).state = module.exports.Event.INITIALIZED
                        delete events.get(this).waitFor
                    })

                return events.get(this).waitFor || Promise.resolve()
            }
        }

    }
})
