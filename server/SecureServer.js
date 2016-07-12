"use strict"

const errors = require("./errors")
const fs = require("fs")
const klass = require("../lib/class").class

const Server = require("./Server").Server

module.exports.SecureServer = klass(Server, statics => {
    const servers = new WeakMap

    return {
        constructor: function(port, {key, crt, ca}){
            Server.call(this, port)

            servers.set(this, Object.create(null))
            servers.get(this).secure = true
            servers.get(this).key = fs.readFileSync(key)
            servers.get(this).cert = fs.readFileSync(crt)
            servers.get(this).ca = fs.readFileSync(ca)
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
