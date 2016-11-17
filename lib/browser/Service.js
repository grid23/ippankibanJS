"use strict"

const errors = require("../errors")
const isSameDomain = require("../isSameDomain").isSameDomain
const klass = require("../class").class
const serialize = require("../Serializer").Serializer.serialize
const typeOf = require("../type").typeOf

const Event = require("../Event").Event
const Model = require("../Model").Model
const Node = require("../Node").Node

module.exports.Service = klass(Node, statics => {
    const services = new WeakMap
    const defaultHandler = request => [request.status, request]


    Object.defineProperties(statics, {
        isLocalFile: { enumerable: true,
            value: isSameDomain
        }
      , getConfig: { enumerable: true,
            value: function(service){
                if ( !services.has(service) )
                  throw new TypeError(errors.TODO)

                return {
                    url: services.get(service).get("url")
                  , xdomain: services.get(service).get("xdomain")
                  , method: services.get(service).get("type")
                  , local: services.get(service).get("local")
                  , credentials: services.get(service).get("credentials")
                  , widthCredentials: services.get(service).get("withCredentials")
                  , requestHeader: services.get(service).get("requestHeaders")
                  , overrideMimeType: services.get(service).get("overrideMimeType")
                  , timeout: services.get(service).get("timeout")
                  , async: services.get(service).get("async")
                  , responseType: services.get(service).get("responseType")
                }
            }
        }
    })

    return {
        constructor: function(...args){
            Node.call(this)

            const handler = typeOf(args[args.length-1]) == "function" ? args.pop() : defaultHandler
            const dict = typeOf(args[0]) == "object" ? args.shift()
                       : typeOf(args[0]) == "string" ? { url: args.shift() }
                       : {}

            services.set(this, new Map)
            services.get(this).set("url", typeOf(dict.url) == "string"
                                   ? dict.url
                                   : void function(){ throw new TypeError(errors.TODO) }())
            services.get(this).set("xdomain", !!dict.crossDomain || !!dict.xdomain)
            services.get(this).set("local", module.exports.Service.isLocalFile(services.get(this).get("url")))
            services.get(this).set("jsonp", services.get(this).get("xdomain") && !services.get(this).get("local"))
            services.get(this).set("handler", handler)
            services.get(this).set("type", typeOf(dict.method) == "string" ? dict.method.toUpperCase() : "GET")
            services.get(this).set("async", !dict.sync)
            services.get(this).set("credentials", dict.credentials && typeOf(dict.credentials.user) == "string"
                                   && typeOf(dict.credentials.password) == "string"
                                   ? dict.credentials
                                   : null)
            services.get(this).set("withCredentials", !!services.get(this).get("credentials"))
            services.get(this).set("timeout", +dict.timeout || 0)
            services.get(this).set("requestHeaders", typeOf(dict.headers) == "object" ? dict.headers : null)
            services.get(this).set("overrideMimeType", dict.overrideMimeType)
            services.get(this).set("responseType", dict.responseType)

            services.get(this).set("ongoing", null)

        }
      , abort: { enumerable: true,
            value: function(){
                if ( services.get(this).get("ongoing") )
                  return services.get(this).get("ongoing").abort()
            }
        }
      , request: { enumerable: true,
            value: function(...args){
                const cb = typeOf(args[args.length-1]) == "function" ? args.pop() : null
                const body = args.shift() || null
                const onerr = e => { throw e }
                let request

                this.abort()
                return new Promise((resolve, reject) => {
                    if ( Model.isImplementedBy(body) )
                      body.read("*", (err, data) => {
                          if ( err ) onerr(err)

                          resolve(serialize(data))
                      })
                    else if ( typeOf(body) == "object" )
                      resolve( serialize(body) )
                    else if ( typeOf(body) == "string" )
                      resolve( body )
                    else resolve(null)
                })
                .catch(e => { throw e })
                .then(body => {
                    return new Promise((resolve, reject) => {
                        request = services.get(this).set("ongoing", new XMLHttpRequest).get("ongoing")

                        request.open(services.get(this).get("type"),
                                     services.get(this).get("url"),
                                     services.get(this).get("async"),
                                     services.get(this).get("withCredentials") ? services.get(this).get("credentials").user : void 0,
                                     services.get(this).get("withCredentials") ? services.get(this).get("credentials").password: void 0)
                        request.timeout = services.get(this).get("timeout")


                        if ( services.get(this).get("headers") )
                          Object.keys(services.get(this).get("headers"))
                            .forEach( header => request.setRequestHeader(header, services.get(this).get("headers")[header]) )

                        if ( services.get(this).get("xdomain") )
                          request.setRequestHeader("Origin", location.protocol+"//"+location.host)

                        if ( services.get(this).get("overrideMimeType") )
                          request.overrideMimeType(services.get(this).get("overrideMimeType"))

                        request.onreadystatechange = () => {
                            if ( request.readyState < 4 )
                              return

                            if ( services.get(this).get("ongoing") !== request )
                              return reject(new Error(errors.TODO))

                            if ( request.status < 400 )
                              resolve()
                            else
                              reject(new Error(request.status))
                        }

                        request.onerror = e => reject(e)
                        request.ontimeout = e => reject(new Error("timeout"))
                        request.send(body)
                    })
                })
                .catch(e => e)
                .then(e => {
                    if ( cb )
                      cb.apply(e||null, [].concat(e||null, services.get(this).get("handler").call(this, request)))

                    if ( services.get(this).get("ongoing") === request)
                      services.get(this).set("ongoing", null)
                    return request
                })
            }
        }
    }
})
