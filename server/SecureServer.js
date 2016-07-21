"use strict"

const errors = require("./errors")
const fs = require("fs")
const https = require("https")
const inherits = require("util").inherits
const klass = require("../lib/class").class
const objectify = require("../lib/Serializer").Serializer.objectify
const parse = require("url").parse
const path = require("path")
const tls = require("tls")
const typeOf = require("../lib/type").typeOf

const Event = require("../lib/Event").Event
const Route = require("../lib/Route").Route
const Router = require("../lib/Router").Router
const Server = require("./Server").Server

module.exports.SecureServer = klass(Router, /* via util.inherits: https.Server, tls.Server */ statics => {
    const servers = new WeakMap

    Object.defineProperties(statics, {
        Route: { enumerable: true,
            get: function(){ return Server.Route
            }
        }
      , CatchAllRoute: { enumerable: true,
            get: function(){ return Server.CatchAllRoute }
        }
    })

    return {
        constructor: function({key, crt, ca} = {}){
            servers.set(this, Object.create(null))
            Router.apply(this, arguments)
            this.Route = module.exports.SecureServer.Route // from Router

            servers.get(this).secure = true
            servers.get(this).key = fs.readFileSync(key)
            servers.get(this).cert = fs.readFileSync(crt)
            servers.get(this).ca = fs.readFileSync(ca)

            https.Server.call(this, this.options)

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
      , options: { enumerable: true,
            get: function(opts){
                opts = { // TODO
                    requestCert: true
                  , rejectUnauthorized: false
                }

                opts.key = this.ssl_key
                opts.cert = this.ssl_cert
                opts.ca = this.ssl_ca

                return opts
            }
        }
      , secure: { enumerable: true,
            get: function(){ return !!servers.get(this).secure }
        }
      , ssl_key: { enumerable: true,
            get: function(){ return servers.get(this).key }
        }
      , ssl_cert: { enumerable: true,
            get: function(){ return servers.get(this).cert }
        }
      , ssl_ca: { enumerable: true,
            get: function(){ return  servers.get(this).ca }
        }
    }
})

inherits(module.exports.SecureServer, tls.Server)
inherits(module.exports.SecureServer, https.Server)
