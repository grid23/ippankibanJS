"use strict"

const errors = require("./errors")
const fs = require("fs")
const http = require("http")
const https = require("https")
const klass = require("../lib/class").class
const objectify = require("../lib/Serializer").Serializer.objectify
const parse = require("url").parse
const path = require("path")
const typeOf = require("../lib/type").typeOf

const Event = require("../lib/Event").Event
const Route = require("../lib/Route").Route
const Router = require("../lib/Router").Router

module.exports.Route = klass(Route, statics => {
    const routes = new WeakMap

    return {
        constructor: function(request, response){
            const query = parse(request.url).search||""
            const fullpath = [request.secure?"https://":"http://",request.headers.host, parse(request.url).pathname, query].join("")
            const path = ["/", request.method, parse(request.url).pathname].join("")

            Route.call(this, path, { request, response })

            routes.set(this, Object.create(null))
            routes.get(this).query = objectify(query.slice(1))
            routes.get(this).fullpath = fullpath
        }
      , fullpath: { enumerable: true,
            get: function(){ return routes.get(this).fullpath }
        }
      , query: { enumerable: true,
            get: function(){ return routes.get(this).query }
        }
    }
})

module.exports.CatchAllRoute = klass(module.exports.Route, statics => {
    const routes = new WeakMap

    return {
        constructor: function(request, response){
            const query = parse(request.url).search||""
            const fullpath = [request.secure?"https://":"http://",request.headers.host, parse(request.url).pathname, query].join("")

            Route.call(this, "catchall", { request, response })
            routes.set(this, Object.create(null))

            routes.set(this, Object.create(null))
            routes.get(this).query = objectify(query.slice(1))
            routes.get(this).fullpath = fullpath
        }
    }
})

module.exports.Server = klass(Router, statics => {
    const servers = new WeakMap

    Object.defineProperties(statics, {
        Route: { enumerable: true,
            get: function(){ return module.exports.Route
            }
        }
      , CatchAllRoute: { enumerable: true,
            get: function(){ return module.exports.CatchAllRoute }
        }
    })

    return {
        constructor: function(port){
            Router.apply(this, arguments)
            servers.set(this, Object.create(null))

            if ( port && typeOf(port) == "number" )
              servers.get(this).port = port

            this.Route = module.exports.Route
        }
      , CatchAllRoute: { enumerable: true,
            get: function(){ return servers.get(this).Route || module.exports.CatchAllRoute }
          , set: function(v){
                if ( Route.isImplementedBy(v) && typeOf(v) == "function" )
                  servers.get(this).CatchAllRoute = v
            }
        }
      , listen: { enumerable: true,
            value: function(port){
                if ( port && typeOf(port) == "number" )
                  servers.get(this).port = servers.get(this).port || port

                if ( !servers.get(this).port )
                  throw new Error(errors.TODO)

                if ( !!servers.get(this).server && !!servers.get(this).server.listening )
                  return

                servers.get(this).server = !this.secure || !this.options
                                         ? new http.Server
                                         : new https.Server(this.options)

                servers.get(this).server.on("request", (request, response) => {
                    this.dispatchRoute(new this.Route(request, response))
                      .addEventListener("routing", e => {
                          if ( !e.count )
                            this.dispatchRoute(new this.Route(request, response))
                              .addEventListener("routing", e => {
                                  if ( !e.count )
                                    response.writeHead("404"),
                                    response.end()
                              })
                      })
                })

                return http.Server.prototype.listen.apply(servers.get(this).server, [servers.get(this).port])
            }
        }
      , stop: { enumerable: true,
            value: function(){
                if ( !!servers.get(this).server && !servers.get(this).server.listening )
                  return

                servers.get(this).server.close()
            }
        }
    }
})
