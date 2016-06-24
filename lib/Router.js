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
        dispatcher: { enumerable: true,
            value: function(cache){
                function getRule(str, regexp, nregexp, assignments, split, nsplit, join, pile, i, l){
                    if ( !cache[str] )
                      if ( str.indexOf(":") == -1 )
                        cache[str] = new RegExp("^"+str+"$", "i")
                      else {
                        assignments = []
                        //regexp = []
                        nregexp = []

                        //split = str.split(/\/|\.(?=:)/)

                        nsplit = []
                        join = []

                        pile = ""

                        for ( i = 0, l = str.length; i<=l; i++)
                          void function(char){
                              if ( i === l ) {
                                  if ( pile.length )
                                    nsplit.push(pile)
                              }
                              else if ( char === "/")
                                nsplit.push(pile),
                                join.push(char),
                                pile = ""
                              else if ( char === "." && str[i+1] === ":" )
                                nsplit.push(pile),
                                join.push(char),
                                pile = ""
                              else
                                pile += char
                          }( str[i] )

                        while ( nsplit.length )
                          void function(part, match, joiner){
                              joiner = join.shift()
                              if ( part[0] === ":" ) {

                                if ( match = part.match(/^:(\w+)(\(.*\))$/), match ) {
                                  assignments.push(match[1])
                                  nregexp.push(match[2])
                                } else {
                                  assignments.push(part.slice(1))
                                  //regexp.push("([^\\\/]*)")
                                  nregexp.push("([^\\"+(joiner||"\/")+"]*)")
                                }

                              } else {
                                //regexp.push(part)
                                nregexp.push(part)
                              }

                              joiner && nregexp.push("(?:\\"+joiner+")")
                          }( nsplit.shift() )

                        //cache[str] = new RegExp("^"+regexp.join("(?:\\\/|\\\.)")+"$", "i")
                        cache[str] = new RegExp("^"+nregexp.join("")+"$", "i")
                        cache[str].assignments = assignments
                      }

                    return cache[str]
                }

                return function(route, path, rule, match){
                    rule = getRule(path)
                    match = route.path.match(rule)

                    if ( !match )
                      return false

                    if ( match.length == 1 || !rule.assignments )
                      return true

                    return function(i, l){
                        for ( ; i < l; i++ )
                          route.matches[rule.assignments[i]] = match[i+1]

                        return route
                    }(0, rule.assignments.length)
                }
            }( Object.create(null) )
        }
      , isRouteHandler: { enumerable: true,
            value: RouteDispatcher.isRouteHandler
        }
    })

    return {
        constructor: function(routes = {}, dict = {}, ...args){
            routers.set(this, Object.create(null))

            routers.get(this).routes = Object.create(null)
            routers.get(this).Route = typeOf(dict.Route) == "function" && Route.isImplementedBy(route)
                                    ? dict.Route
                                    : Route

            this.addRouteHandler(routes)
        }
      , addRouteHandler: { enumerable: true,
            value: function(path, handler){
                if ( arguments.length == 1 && typeOf(arguments[0]) == "object" )
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
            value: function(){}
        }
      , handlers: { enumerable: true,
            value: function(){}
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
            get: function(){}
          , set: function(){}
        }
      , routes: { enumerable: true,
            get: function(){ return routers.get(this).routes }
        }
    }
})
