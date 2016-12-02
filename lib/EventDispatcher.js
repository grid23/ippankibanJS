"use strict"

const errors = require("./errors")
const eventWM = require("./Event")._eventWM
const klass = require("./class").class
const performance = require("./performance")
const typeOf = require("./type").type

const Event = require("./Event").Event

module.exports.EventDispatcher = klass(statics => {
    let logging = false

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
      , log: { enumerable: true,
            get: () => logging
          , set: v => logging = !!v
        }
    })

    return {
        constructor: function({event, global, target}){
            if ( !Event.isImplementedBy(event) )
              throw new TypeError(errors.UNSPECIFIED_EVENT_ERR)
            //dispatchers.set(this, new Map)

            if ( !eventWM.has(event) )
              throw new Error(errors.ERR_OBJ_ALREADY_DESTROYED)

            // assign target to event
            eventWM.get(event).set("target", target)
            eventWM.get(event).set("timestamp", Date.now())
            eventWM.get(event).set("highrestimestamp", performance.now())

            // gather handlers
            const capture = []
            const bubble = []
            let node = target

            while ( !!node ) {
                let handlers

                handlers = node.captures[event.type]
                if ( typeOf(handlers) == "array" )
                  handlers.forEach(fn => capture.unshift(fn))
                else if ( !!handlers )
                  capture.unshift(handlers)

                handlers = node.events[event.type]
                if ( typeOf(handlers) == "array" ) {
                    if ( node === target )
                      handlers.forEach(fn => capture.push(fn)) //bubble can be cancelled
                    else
                      handlers.forEach(fn => bubble.push(fn))
                }
                else if ( !!handlers ) {
                    if ( node === target )
                      capture.push(handlers)
                    else
                      bubble.push(handlers)
                }

                node = node.parentNode
            }

            // push global event in the case of a broadcast
            if ( !!global ) {
                if ( typeOf(global) == "array" )
                  handlers.forEach(fn => bubble.push(fn))
                else
                  bubble.push(global)
            }

            const handlers = bundleHandlers( event.bubbles ? capture.concat(bubble) : capture )
            const count = handlers.length

            if ( logging )
              console.log("event =>", event.type, "event:", event, "handlers:", handlers)

            if ( event.type == "error" && !handlers.length )
              if ( event.detail instanceof Error || typeOf(event.detail) == "error" )
                throw event.detail
              else
                throw new Error(event.detail || "")

            const dispatchLoop = function*(){
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

            const next = () => {
                if ( dispatchLoop.next().done ) {
                    if ( Event.destroyable(event) )
                      Event.destroy(event)
                    return
                }

                if ( event.state === Event.PAUSED)
                  event.wait().then(next)
                else next()
            }

            next()
            return count
        }
    }
})
