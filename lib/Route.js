"use strict"

const error = require("./errors")
const klass = require("./class").class
const typeOf = require("./type").type

module.exports._routeWM = new WeakMap

module.exports.Route = klass(statics => {
    const routes = module.exports._routeWM

    Object.defineProperties(statics, {
        UNINITIALIZED: { enumerable: true, value: 0 }
      , INITIALIZED: { enumerable: true, value: 1 }
      , PAUSED: { enumerable: true, value: 2 }
      , STOPPED: { enumerable: true, value: 3 }
      , RUNNING: { enumerable: true, value: 4 }
    })

    return {
        constructor: function(path, detail){
            routes.set(this, new Map)
            routes.get(this).set("path", typeOf(path) == "string" ? path : function(){ throw new TypeError(errors.UNSPECIFIED_ROUTE_PATH_ERR) }())
            routes.get(this).set("detail", typeOf(detail) == "object" ? (detail.hasOwnProperty(detail) ? detail.detail : detail)
                                : detail && detail.length == 1 ? detail[0]
                                : detail && detail.length > 1 ? [].concat(detail)
                                : null)

            if ( routes.get(this).get("detail") && !!routes.get(this).get("detail").request ) {
                routes.get(this).set("request", routes.get(this).detail.request)
                delete routes.get(this).get("detail").request
            }

            if ( routes.get(this).get("detail") && !!routes.get(this).get("detail").response ) {
                routes.get(this).set("response", routes.get(this).detail.response)
                delete routes.get(this).get("detail").response
            }

            routes.get(this).set("timestamp", null)
            routes.get(this).set("state", module.exports.Route.INITIALIZED)
            routes.get(this).set("cancelable", detail && Object.prototype.hasOwnProperty.call(detail, "cancelable") ? detail.cancelable : true)
        }
      , cancelable: { enumerable: true,
            get: function(){ return !!routes.get(this).get("cancelable") }
        }
      , cancelled: { enumerable: true,
            get: function(){ return !!routes.get(this).get("cancelled") }
          , set: function(v){ routes.get(this).set("cancelled", !!v)  }
        }
      , detail: { enumerable: true,
            get: function(){ return routes.get(this).get("detail") }
        }
      , matches: { enumerable: true,
            get: function(){ return routes.get(this).get("matches") }
        }
      , path: { enumerable: true,
            get: function(){ return routes.get(this).get("path") }
        }
      , preventDefault: { enumerable: true,
            value: function(){ routes.get(this).set("cancelled", true) }
        }
      , request: { enumerable: true,
            get: function(){ return routes.get(this).get("request") }
        }
      , response: { enumerable: true,
            get: function(){ return routes.get(this).get("response") }
        }
      , state: { enumerable: true,
            get: function(){ return routes.get(this).get("state") || module.exports.Route.UNINITIALIZED }
        }
        /*
      , stop: { enumerable: true,
            value: function(){
                routes.get(this).state = module.exports.Route.STOPPED
            }
        }
        */
      , target: { enumerable: true,
            get: function(){ return routes.get(this).get("target") }
        }
      , timestamp: { enumerable: true,
            get: function(){ return routes.get(this).get("timestamp") }
        }
      , wait: { enumerable: true,
            value: function(fn){
                if ( typeOf(fn) == "function" )
                  routes.get(this).set("state", module.exports.Route.PAUSED),
                  routes.get(this).set("waitFor", new Promise(resolve => { fn(resolve) })),
                  routes.get(this).get("waitFor").catch(e => setTimeout(()=>{ throw e }, 4)),
                  routes.get(this).get("waitFor").then(()=>{
                        routes.get(this).set("state", module.exports.Route.INITIALIZED)
                        routes.get(this).delete("waitFor")
                    })

                return routes.get(this).get("waitFor") || Promise.resolve()
            }
        }

    }
})
