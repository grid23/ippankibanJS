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
    })

    return {
        constructor: function(...args){
            Node.call(this)

            const handler = typeOf(args[args.length-1]) == "function" ? args.pop() : defaultHandler
            const dict = typeOf(args[args.length-1]) == "object" ? args.pop()
                 : typeOf(args[args.length-1]) == "string" ? { url: args.pop() }
                 : {}

            services.set(this, Object.create(null))
            services.get(this).url = typeOf(dict.url) == "string"
                                   ? dict.url
                                   : void function(){ throw new TypeError(errors.TODO) }()
            services.get(this).xdomain = !!dict.crossDomain || !!dict.xdomain
            services.get(this).jsonp = services.get(this).xdomain && !module.exports.Service.isLocalFile(url)
            services.get(this).handler = handler
            services.get(this).type = typeOf(dict.type) == "string" ? dict.type.toUpperCase() : "GET"
            services.get(this).async = !dict.sync
            services.get(this).credentials = dict.credentials && typeOf(dict.credentials.user) == "string"
                                           && typeOf(dict.credentials.password) == "string"
                                           ? dict.credentials
                                           : null
            services.get(this).withCredentials = !!services.get(this).credentials
            services.get(this).timeout = +dict.timeout || 0
            services.get(this).requestHeaders = typeOf(dict.headers) == "object" ? dict.headers : null
            services.get(this).overrideMimeType = dict.overrideMimeType
            services.get(this).responseType = dict.responseType

            services.get(this).ongoing = null

        }
      , abort: { enumerable: true,
            value: function(){
                if ( services.get(this).ongoing )
                  return services.get(this).ongoing.abort()
            }
        }
      , request: { enumerable: true,
            value: function(...args){
                const cb = typeOf(args[args.length-1]) == "function" ? args.pop() : null
                const body = args[0]
                const onerr = e => { throw e }
                let request

                this.abort()
                return new Promise((resolve, reject) => {
                    if ( Model.isImplementedBy(body) )
                      body.read("*", (err, data) => {
                          if ( err ) onerr(err)

                          resolve(serialize(data))
                      })
                    else if ( typeOf(args[args.length-1]) == "object" )
                      resolve( serialize(body) )
                    else resolve(null)
                })
                .catch(e => { throw e })
                .then(body => {
                    return new Promise((resolve, reject) => {
                        request = services.get(this).ongoing = new XMLHttpRequest

                        request.open(services.get(this).type,
                                     services.get(this).url,
                                     services.get(this).async,
                                     services.get(this).withCredentials ? services.get(this).credentials.user : void 0,
                                     services.get(this).withCredentials ? services.get(this).credentials.password: void 0)
                        request.timeout = services.get(this).timeout

                        if ( services.get(this).headers )
                          Object.keys(services.get(this).headers)
                            .forEach( header => request.setRequestHeader(header, services.get(this).headers[header]) )

                        if ( services.get(this).overrideMimeType )
                          request.overrideMimeType(services.get(this).overrideMimeType)

                        request.onreadystatechange = () => {
                            if ( request.readyState < 4 )
                              return

                            if ( services.get(this).ongoing !== request )
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
                .catch(e => {
                    return e
                })
                .then(e => {
                    if ( cb )
                      cb.apply(e||null, [].concat(e||null, services.get(this).handler.call(this, request)))

                    if ( services.get(this).ongoing === request)
                      services.get(this).ongoing = null
                    return request
                })
            }
        }
    }
})
