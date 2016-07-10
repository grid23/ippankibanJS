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
        constructor: function({event, target, global}){
            if ( !Event.isImplementedBy(event) )
              throw new TypeError(errors.UNSPECIFIED_EVENT_ERR)
            dispatchers.set(this, Object.create(null))

            // assign target to event
            eventWM.get(event).target = target
            eventWM.get(event).timestamp = Date.now()

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
            dispatchers.get(this).count = handlers.length

            if ( event.type == "error" && !handlers.length )
              return setTimeout(()=> { // get of promise and other catching bodies
                  if ( event.detail instanceof Error )
                    throw event.detail
                  else
                    throw new Error(event.detail || "")
              }, 4)

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
