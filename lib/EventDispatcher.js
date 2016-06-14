"use strict"

const errors = require("./errors")
const eventWM = require("./Event")._eventWM
const klass = require("./class").class
const typeOf = require("./type").type

const Event = require("./Event").Event

module.exports.EventDispatcher = klass(statics => {
    const dispatchers = new WeakMap

    const bundleHandlers = (handlers) => {
        if ( module.exports.EventDispatcher.isEventListener(handlers) )
          return [handlers]

        if ( typeOf(handlers) == "array" )
          return handlers.filter(function(handler){
              return module.exports.EventDispatcher.isEventListener(handler)
          })

        return []
    }

    Object.defineProperties(statics, {
        isEventListener: { enumerable: true,
            value: o => {
                return !!o && (typeOf(o) == "function" || typeOf(o.handleEvent) == "function")
            }
        }
    })

    return {
        constructor: function(event, target, capture, bubble){
            if ( !Event.isImplementedBy(event) )
              throw new TypeError(errors.UNSPECIFIED_EVENT_ERR)

            dispatchers.set(this, Object.create(null))

            let handlers = bundleHandlers( event.bubbles ? capture.concat(bubble) : capture )
            dispatchers.get(this).count = handlers.length

            if ( event.type == "error" && !handlers )
              if ( event.error instanceof Error )
                throw event.error
              else
                throw new Error(event.error || "")

            let dispatchLoop = function*(){
                while ( !!handlers.length ) {
                    if ( event.state === Event.STOPPED )
                      return

                    let handler = handlers.shift()

                    if ( handler.handleEvent )
                      yield handler.handleEvent.call(handler, event)
                    else
                      yield handler.call(null, event)
                }
            }.call(this)

            let next = function(){
                if ( dispatchLoop.next().done )
                  return

                if ( event.state === Event.PAUSED)
                  event.wait().then(next)
                else next()
            }
            next()

        }
      , count: { enumerable: true,
            get: function(){ return dispatchers.get(this).count }
        }
    }
})
