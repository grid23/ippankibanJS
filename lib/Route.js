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
            routes.set(this, Object.create(null))
            routes.get(this).path = typeOf(path) == "string" ? path : function(){ throw new TypeError(errors.UNSPECIFIED_ROUTE_PATH_ERR) }()
            routes.get(this).detail = typeOf(detail) == "object" ? (detail.hasOwnProperty(detail) ? detail.detail : detail)
                                    : detail && detail.length == 1 ? detail[0]
                                    : detail && detail.length > 1 ? [].concat(detail)
                                    : null

            if ( routes.get(this).detail && !!routes.get(this).detail.request ) {
                routes.get(this).request = routes.get(this).detail.request
                delete routes.get(this).detail.request
            }

            if ( routes.get(this).detail && !!routes.get(this).detail.response ) {
                routes.get(this).response = routes.get(this).detail.response
                delete routes.get(this).detail.response
            }

            routes.get(this).timestamp = null
            routes.get(this).state = module.exports.Route.INITIALIZED
            routes.get(this).cancelable = detail && Object.prototype.hasOwnProperty.call(detail, "cancelable") ? detail.cancelable : true
        }
      , cancelable: { enumerable: true,
            get: function(){ return !!routes.get(this).cancelable }
        }
      , cancelled: { enumerable: true,
            get: function(){ return !!routes.get(this).cancelled }
          , set: function(v){ routes.get(this).cancelled = !!v  }
        }
      , detail: { enumerable: true,
            get: function(){ return routes.get(this).detail }
        }
      , matches: { enumerable: true,
            get: function(){ return routes.get(this).matches }
        }
      , path: { enumerable: true,
            get: function(){ return routes.get(this).path }
        }
      , preventDefault: { enumerable: true,
            value: function(){ routes.get(this).cancelled = true }
        }
      , request: { enumerable: true,
            get: function(){ return routes.get(this).request }
        }
      , response: { enumerable: true,
            get: function(){ return routes.get(this).response }
        }
      , state: { enumerable: true,
            get: function(){ return routes.get(this).state || module.exports.Route.UNINITIALIZED }
        }
        /*
      , stop: { enumerable: true,
            value: function(){
                routes.get(this).state = module.exports.Route.STOPPED
            }
        }
        */
      , target: { enumerable: true,
            get: function(){
                return routes.get(this).target
            }
        }
      , timestamp: { enumerable: true,
            get: function(){ return routes.get(this).timestamp }
        }
      , wait: { enumerable: true,
            value: function(fn){
                if ( typeOf(fn) == "function" )
                  routes.get(this).state = module.exports.Route.PAUSED,
                  routes.get(this).waitFor = new Promise(resolve => { fn(resolve) }),

                  routes.get(this).waitFor.catch(e => setTimeout(()=>{ throw e }, 4)),
                  routes.get(this).waitFor.then(()=>{
                        routes.get(this).state = module.exports.Route.INITIALIZED
                        delete routes.get(this).waitFor
                    })

                return routes.get(this).waitFor || Promise.resolve()
            }
        }

    }
})
