"use strict"

const errors = require("./errors")
const klass = require("./class").class
const typeOf = require("./type").type

const Event = require("./Event").Event
const EventTarget = require("./EventTarget").EventTarget
const Route = require("./Route").Route
const RouteDispatcher = require("./RouteDispatcher").RouteDispatcher

module.exports.Router = klass(EventTarget, statics => {
    const routers = new WeakMap

    Object.defineProperties(statics, {
        isRouteHandler: { enumerable: true,
            value: RouteDispatcher.isRouteHandler
        }
    })

    return {
        constructor: function(dict = {}, ...args){
            routers.set(this, new Map)
            routers.get(this).set("routes", Object.create(null))

            this.Route = dict.Route || Route
        }
      , addRouteHandler: { enumerable: true,
            value: function(path, handler){
                if ( arguments.length > 1 && typeOf(arguments[0]) == "array" )
                  return function(routes, count){
                      count = 0

                      while (routes.length)
                        count += this.addRouteHandler(routes.shift(), handler)

                      return count
                  }.call(this, [...arguments[0]])
                else if ( arguments.length == 1 && typeOf(arguments[0]) == "object" )
                  return function(o){
                      let count = 0

                      for ( let k in o )
                        count += this.addRouteHandler(k, o[k])

                      return count
                  }.call(this, arguments[0])

                if ( typeOf(path) !== "string" )
                  throw new TypeError(errors.TODO)

                if ( !module.exports.Router.isRouteHandler(handler) )
                  throw new TypeError(errors.TODO)

                if ( typeOf(this.routes[path]) == "array" )
                  this.routes[path].push(handler)
                else if ( module.exports.Router.isRouteHandler(this.routes[path]))
                  this.routes[path] = [this.routes[path], handler]
                else
                  this.routes[path] = handler

                return 1
            }
        }
      , dispatchRoute: { enumerable: true,
            value: function(route, ...detail){
                route = Route.isImplementedBy(route) ? route : new this.Route(route, detail)
                return new RouteDispatcher({ route, target: this })
            }
        }
      , removeRouteHandler: { enumerable: true,
            value: function(path, handler){
                if ( arguments.length == 1 && typeOf(arguments[0]) == "object" )
                  return function(o){
                      let count = 0

                      for ( let k in o )
                        count += this.removeEventListener(k, o[k])

                      return count
                  }.call(this, arguments[0])

                  if ( typeOf(this.routes[path]) == "array" ) {
                      let count = 0
                      let idx

                      while ( idx = this.routes[path].indexOf(handler), idx != -1 )
                        this.routes[path].splice(idx, 1),
                        count += 1

                      let l = this.routes[path].length
                      if ( !l )
                        delete this.routes[path]
                      else if ( l == 1 )
                        this.routes[path] = this.route[path][0]

                      return count
                  } else if ( this.routes[path] === handler ) {
                        delete this.routes[path]

                        return 1
                  }

                  return 0
            }
        }
      , Route: { enumerable: true,
            get: function(){ return routers.get(this).get("Route") }
          , set: function(v){
                if ( typeOf(v) == "function" && Route.isImplementedBy(v) )
                  routers.get(this).set("Route", v)
                else throw new TypeError(errors.TODO)
            }
        }
      , routes: { enumerable: true,
            get: function(){ return routers.get(this).get("routes") }
        }
    }
})
