"use strict"

const errors = require("./errors")
const routeWM = require("./Route")._routeWM
const klass = require("./class").class
const typeOf = require("./type").type

const Route = require("./Route").Route

module.exports.RouteDispatcher = klass(statics => {
    const dispatchers = new WeakMap

    const bundleHandlers = (handlers) => {
        if ( module.exports.RouteDispatcher.isRouteHandler(handlers) )
          return [handlers]

        if ( typeOf(handlers) == "array" )
          return handlers.filter(function(handler){
              return module.exports.RouteDispatcher.isRouteHandler(handler)
          })

        return []
    }

    Object.defineProperties(statics, {
        isRouteHandler: { enumerable: true,
            value: o => {
                return !!o && (typeOf(o) == "function" || typeOf(o.handleRoute) == "function")
            }
        }
    })

    return {
        constructor: function(route, target, capture, bubble){
            if ( !Route.isImplementedBy(route) )
              throw new TypeError(errors.UNSPECIFIED_EVENT_ERR)

            dispatchers.set(this, Object.create(null))

            let handlers = bundleHandlers( handlers )
            dispatchers.get(this).count = handlers.length

            let dispatchLoop = function*(){
                while ( !!handlers.length ) {
                    if ( route.state === route.STOPPED )
                      return

                    let handler = handlers.shift()

                    if ( handler.handleRoute )
                      yield handler.handleRoute.call(handler, route)
                    else
                      yield handler.call(null, route)
                }
            }.call(this)

            let next = function(){
                if ( dispatchLoop.next().done )
                  return

                if ( route.state === Route.PAUSED)
                  route.wait().then(next)
                else next()
            }
            next()

        }
      , count: { enumerable: true,
            get: function(){ return dispatchers.get(this).count }
        }
    }
})
