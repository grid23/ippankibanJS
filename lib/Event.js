"use strict"

const error = require("./errors")
const klass = require("./class").class
const performance = require("./performance")
const typeOf = require("./type").type

module.exports._eventWM = new WeakMap

module.exports.Event = klass(statics => {
    const events = module.exports._eventWM
    const marked4survival = new WeakSet
    const marked4deletion = new Set

    Object.defineProperties(statics, {
        UNINITIALIZED: { enumerable: true, value: 0 }
      , INITIALIZED: { enumerable: true, value: 1 }
      , PAUSED: { enumerable: true, value: 2 }
      , STOPPED: { enumerable: true, value: 3 }

      , destroyable: { enumerable: true,
            value: event => {
                if ( marked4survival.has(events.get(event)) )
                  return false
                return true
            }
        }
      , destroy: { enumerable: true,
            value: event => {
                if ( !events.has(event) )
                  return false

                events.get(event).clear()
                events.delete(event)
                return true
            }
        }
      , keepAlive: { enumerable: true,
            value: event => {
                if ( !events.has(event) )
                  return false

                marked4survival.add(events.get(event))
                return true
            }
        }
    })

    return {
        constructor: function(type, detail){
            events.set(this, new Map)
            events.get(this).set("type", typeOf(type) == "string" ? type : function(){ throw new TypeError(errors.UNSPECIFIED_EVENT_TYPE_ERR) }())
            events.get(this).set("detail", typeOf(detail) == "object" ? (detail.hasOwnProperty(detail) ? detail.detail : detail)
                                                                      : typeOf(detail) == "error" ? detail
                                                                      : detail instanceof Error ? detail
                                                                      : detail && detail.length == 1 ? detail[0]
                                                                      : detail && detail.length > 1 ? [].concat(detail)
                                                                      : null)
            events.get(this).set("timestamp", Date.now())
            events.get(this).set("highresTimestamp", performance.now())
            events.get(this).set("state", module.exports.Event.INITIALIZED)
            events.get(this).set("bubbles", detail && Object.prototype.hasOwnProperty.call(detail, "bubbles") ? detail.bubbles : true)
            events.get(this).set("cancelable", detail && Object.prototype.hasOwnProperty.call(detail, "cancelable") ? detail.cancelable : true)
        }
      , bubbles: { enumerable: true,
            get: function(){ return !!events.get(this).get("bubbles") }
        }
      , cancelable: { enumerable: true,
            get: function(){ return !!events.get(this).get("cancelable") }
        }
      , cancelled: { enumerable: true,
            get: function(){ return !!events.get(this).get("cancelled") }
          , set: function(v){ events.get(this).set("cancelled", !!v)  }
        }
      , detail: { enumerable: true,
            get: function(){ return events.get(this).get("detail") }
        }
      , highresTimestamp: { enumerable: true,
            get: function(){ return events.get(this).get("highresTimestamp") }
        }
      , preventDefault: { enumerable: true,
            value: function(){ events.get(this).set("cancelled", true) }
        }
      , state: { enumerable: true,
            get: function(){ return events.get(this).get("state") || module.exports.Event.UNINITIALIZED }
        }
      , stop: { enumerable: true,
            value: function(){
                events.get(this).set("state", module.exports.Event.STOPPED)
            }
        }
      , target: { enumerable: true,
            get: function(){
                return events.get(this).get("target")
            }
        }
      , timestamp: { enumerable: true,
            get: function(){ return events.get(this).get("timestamp") }
        }
      , type: { enumerable: true,
            get: function(){ return events.get(this).get("type") }
        }
    }
})
