"use strict"

const errors = require("./errors")
const klass = require("./class").class
const typeOf = require("./type").type

const Event = require("./Event").Event
const EventDispatcher = require("./EventDispatcher").EventDispatcher

module.exports.EventTarget = klass(statics => {
    const eventTargets = new WeakMap
    const globalEvents = Object.create(null)

    Object.defineProperties(statics, {
        addBroadcastEventListener: { enumerable: true,
            value: function(type, handler){
                if ( arguments.length == 1 && typeOf(arguments[0]) == "object" )
                  return function(o){
                      let count = 0

                      for ( let k in o )
                        count += module.exports.EventTarget.addEventListener(k, o[k])

                      return count
                  }.call(null, arguments[0])

                type = typeOf(type) == "string" ? type : function(){ throw new TypeError(errors.ERR_STRING_EXPECTED) }()
                handler = module.exports.EventTarget.isEventListener(handler) ? handler : function(){ throw new TypeError(errors.ERR_HANDLER_EXPECTED)  }()

                if ( typeOf(globalEvents[type])  == "array" )
                  globalEvents[type].push(handler)
                else if ( module.exports.EventTarget.isEventListener(globalEvents[type]) )
                  globalEvents[type] = [globalEvents[type], handler]
                else
                  globalEvents[type] = handler

                return 1
            }
        }
      , isEventListener: { enumerable: true,
          value: EventDispatcher.isEventListener
      }
      , removeBroadcastEventListener: { enumerable: true,
            value: function(type, handler){
                if ( arguments.length == 1 && typeOf(arguments[0]) == "object" )
                  return function(o){
                      let count = 0

                      for ( let k in o )
                        count += module.exports.EventTarget.removeBroadcastEventListener(k, o[k])

                      return count
                  }.call(this, arguments[0])

                type = typeOf(type) == "string" ? type : function(){ throw new TypeError(errors.ERR_STRING_EXPECTED) }()


                if ( typeOf(globalEvents[type]) == "array" ) {
                    let count  = 0
                    let idx

                    while ( idx = globalEvents[type].indexOf(handler), idx != -1 )
                      globalEvents[type].splice(idx, 1),
                      count += 1

                    let l = globalEvents[type].length
                    if ( !l )
                      delete globalEvents[type]
                    else if ( l == 1 )
                      globalEvents[type] = globalEvents[type][0]

                    return count

                } else if ( this[prop][type] === handler ) {
                    delete this[prop][type]

                    return 1
                }

                return 0
            }
        }
    })

    return {
        addEventListener: { enumerable: true,
            value: function(type, handler, capture){
                if ( arguments.length == 1 && typeOf(arguments[0]) == "object" )
                  return function(o){
                      let count = 0

                      for ( let k in o )
                        count += this.addEventListener(k, o[k])

                      return count
                  }.call(this, arguments[0])

                type = typeOf(type) == "string" ? type : function(){ throw new TypeError(errors.ERR_STRING_EXPECTED) }()
                handler = module.exports.EventTarget.isEventListener(handler) ? handler : function(){ throw new TypeError(errors.ERR_HANDLER_EXPECTED)  }()

                let prop = !!capture && typeOf(capture) == "boolean" ? "captures" : "events"
                if ( typeOf(this[prop][type])  == "array" )
                  this[prop][type].push(handler)
                else if ( module.exports.EventTarget.isEventListener(this[prop][type]) )
                  this[prop][type] = [this[prop][type], handler]
                else
                  this[prop][type] = handler


                return 1
            }
        }
      , broadcastEvent: { enumerable: true,
            value: function(event, ...detail){
                event = event instanceof Event ? event : new this.Event(event, detail)
                return new EventDispatcher({ event, global: globalEvents[event.type], target: this })
            }
        }
      , captures: { enumerable: false,
            get: function(){
                let instance = eventTargets.get(this) || eventTargets.set(this, Object.create(null)).get(this)

                instance.captures = instance.captures || Object.create(null)

                return instance.captures
            }
        }
      , dispatchEvent: { enumerable: true,
            value: function(event, ...detail){
                event = event instanceof Event ? event : new this.Event(event, detail)
                return new EventDispatcher({event, target: this})
            }
        }
      , events: { enumerable: false,
            get: function(){
                let instance = eventTargets.get(this) || eventTargets.set(this, Object.create(null)).get(this)

                instance.events = instance.events || Object.create(null)

                return instance.events
            }
        }
      , Event: { enumerable: true,
            get: function(){
                let instance = eventTargets.get(this) || eventTargets.set(this, Object.create(null)).get(this)

                return instance.Event || Event
            }
          , set: function(v){
                let instance = eventTargets.get(this) || eventTargets.set(this, Object.create(null)).get(this)

                if ( Event.isImplementedBy(v) )
                  instance.Event = v
            }
        }
      , removeEventListener: { enumerable: true,
            value: function(type, handler, capture){
                if ( arguments.length == 1 && typeOf(arguments[0]) == "object" )
                  return function(o){
                      let count = 0

                      for ( let k in o )
                        count += this.removeEventListener(k, o[k])

                      return count
                  }.call(this, arguments[0])

                type = typeOf(type) == "string" ? type : function(){ throw new TypeError(errors.ERR_STRING_EXPECTED) }()


                let prop = !!capture && typeOf(capture) == "boolean" ? "captures" : "events"
                if ( typeOf(this[prop][type]) == "array" ) {
                    let count  = 0
                    let idx

                    while ( idx = this[prop][type].indexOf(handler), idx != -1 )
                      this[prop][type].splice(idx, 1),
                      count += 1

                    let l = this[prop][type].length
                    if ( !l )
                      delete this[prop][type]
                    else if ( l == 1 )
                      this[prop][type] = this[prop][type][0]

                    return count

                } else if ( this[prop][type] === handler ) {
                    delete this[prop][type]

                    return 1
                }

                return 0
            }
        }

    }
})
