"use strict"

const errors = require("./errors")
const eventWM = require("./Event")._eventWM
const routeWM = require("./Route")._routeWM
const klass = require("./class").class
const typeOf = require("./type").type

const Event = require("./Event").Event
const EventTarget = require("./EventTarget").EventTarget
const Route = require("./Route").Route

const RoutingEvt = klass(Event, statics => {
    return {
        constructor: function(hit){
            Event.call(this, "routing")
            eventWM.get(this).set("hit", hit)
        }
      , count: { enumerable: true,
            get: function(){
                return eventWM.get(this).get("hit")
            }
        }
    }
})

module.exports.RouteDispatcher = klass(EventTarget, statics => {
    const dispatchers = new WeakMap

    const bundleHandlers = ({routes}) => {
        const wildcards = []
        const handlers = []

        routes = typeOf(routes) == "object" ? routes : {}

        for ( let k in routes ) if ( Object.hasOwnProperty.call(routes, k) ) {
            if ( module.exports.RouteDispatcher.isRouteHandler(routes[k]) )
              if ( k === "*" )
                wildcards.push([k, routes[k]])
              else
                handlers.push([k, routes[k]])

            if ( typeOf(routes[k]) == "array" )
              routes[k].forEach(function(handler){
                  if ( module.exports.RouteDispatcher.isRouteHandler(handler) )
                    if ( k === "*" )
                      wildcards.push([k, handler])
                    else
                      handlers.push([k, handler])
              })
        }

        return [...wildcards, ...handlers]
    }

    Object.defineProperties(statics, {
        dispatcher: { enumerable: true,
            value: function(){
                const cache = Object.create(null)
                const getRule = str => {
                    if ( !cache[str] )
                      if ( str.indexOf(":") == -1 )
                        cache[str] = new RegExp("^"+str+"$", "i")
                      else {
                        const assignments = []
                        const regexp = []
                        const split = []
                        const join = []
                        let pile = ""

                        for ( let i = 0, l = str.length; i <= l; i++ )
                          void function(char){
                              if ( i === l ) {
                                  if ( pile.length )
                                    split.push(pile)
                              }
                              else if ( char === "/")
                                split.push(pile),
                                join.push(char),
                                pile = ""
                              else if ( char === "." && str[i+1] === ":" )
                                split.push(pile),
                                join.push(char),
                                pile = ""
                              else
                                pile += char
                          }( str[i] )

                        while ( split.length )
                          void function(){
                              const part = split.shift()
                              const joiner = join.shift()
                              let match

                              if ( part[0] === ":" ) {

                                if ( match = part.match(/^:(\w+)(\(.*\))$/), match ) {
                                  assignments.push(match[1])
                                  regexp.push(match[2])
                                } else {
                                  assignments.push(part.slice(1))
                                  regexp.push("([^\\"+(joiner||"\/")+"]*)")
                                }

                              } else {
                                regexp.push(part)
                              }

                              joiner && regexp.push("(?:\\"+joiner+")")
                          }()

                        cache[str] = new RegExp("^"+regexp.join("")+"$", "i")
                        cache[str].assignments = assignments
                      }

                    return cache[str]
                }

                return function(route, path){
                    const rule = getRule(path)
                    const match = route.path.match(rule)

                    if ( !match )
                      return false

                    if ( match.length == 1 || !rule.assignments )
                      return true

                    return function(){
                        for ( let i = 0, l = rule.assignments.length ; i < l; i++ )
                          route.matches[rule.assignments[i]] = match[i+1]

                        return route
                    }()
                }
            }()
        }
      , isRouteHandler: { enumerable: true,
            value: o => {
                return !!o && (typeOf(o) == "function" || typeOf(o.handleRoute) == "function")
            }
        }
    })

    return {
        constructor: function({route, target}){
            if ( !Route.isImplementedBy(route) )
              throw new TypeError(errors.UNSPECIFIED_PATH_ERR)

            if ( route.state !== Route.INITIALIZED )
              throw new Error(errors.ROUTE_BUSY_ERR)

            dispatchers.set(this, new Map)
            dispatchers.get(this).set("hits", 0)

            routeWM.get(route).set("state", Route.RUNNING)
            routeWM.get(route).set("target", target)
            routeWM.get(route).set("matches", {})
            routeWM.get(route).set("timestamp", Date.now())

            const handlers = bundleHandlers(target)

            const onstop = () => {
                routeWM.get(route).set("state", Route.INITIALIZED)
                this.dispatchEvent(new RoutingEvt(dispatchers.get(this).get("hits")) )
            }

            const dispatchLoop = function*(){
                while ( !!handlers.length ) {
                    if ( route.state === Route.STOPPED )
                      return

                    routeWM.get(route).set("state", Route.RUNNING)

                    const [path, handler] = handlers.shift()

                    yield new Promise((resolve, reject) => {
                        const match = path === "*" || module.exports.RouteDispatcher.dispatcher(route, path)
                        if ( !match ) return resolve(0)

                        let hit = path === "*" ? 0 :  1
                        let stop = path === "*" ? false : true


                        let next = is_hit => {
                            next = () => console.warn(errors.WARN_LATE_NEXT) //can only be invoked once and during the turn of the exec time of the handler

                            stop = false
                            if ( typeOf(is_hit) == "boolean" )
                              hit = !!is_hit ? 1 : 0
                        }
                        const nextProxy = new Proxy(Function.prototype, {
                            apply: (t, s, a) => next.apply(s, a)
                        })

                        if ( handler.handleRoute )
                          handler.handleEvent.call(handler, route, nextProxy)
                        else
                          handler.call(null, route, nextProxy)

                        const onend =  () => {
                            next = () => console.warn(errors.WARN_LATE_NEXT)

                            if ( stop )
                              routeWM.get(route).set("state", Route.STOPPED)

                            resolve(hit)
                        }

                        if ( route.state === Route.PAUSED )
                          route.wait().then(onend)
                        else onend()
                    })
                }
            }.call(this)

            const next = () => {
                const iteration = dispatchLoop.next()

                if ( iteration.done )
                  return onstop()
                else
                  iteration.value
                  .catch(e => {
                      this.dispatchEvent("error", e)
                  })
                  .then(hit => {
                      dispatchers.get(this).set("hits",  dispatchers.get(this).get("hits") + hit)
                      next()
                  })
            }

            next()
        }
    }
})
