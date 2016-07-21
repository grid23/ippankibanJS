"use strict"

const errors = require("./errors")
const fs = require("fs")
const http = require("http")
const https = require("https")
const inherits = require("util").inherits
const klass = require("../lib/class").class
const net = require("net")
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

module.exports.Server = klass(Router, /* via util.inherits: http.Server, net.Server */ statics => {
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
        constructor: function(){
            servers.set(this, Object.create(null))

            Router.apply(this, arguments)
            this.Route = module.exports.Route // from Router

            http.Server.call(this)

            this.on("request", (request, response) => {
                this.dispatchRoute(new this.Route(request, response))
                  .addEventListener("routing", e => {
                      if ( !e.count )
                        this.dispatchRoute(new this.CatchAllRoute(request, response))
                          .addEventListener("routing", e => {
                              if ( !e.count )
                                response.writeHead("404"),
                                response.end()
                          })
                  })
            })
        }
      , CatchAllRoute: { enumerable: true, configurable: true,
            get: function(){ return servers.get(this).CatchAllRoute || module.exports.Server.CatchAllRoute }
          , set: function(v){
                if ( Route.isImplementedBy(v) && typeOf(v) == "function" )
                  servers.get(this).CatchAllRoute = v
            }
        }
    }
})

inherits(module.exports.Server, net.Server)
inherits(module.exports.Server, http.Server)
