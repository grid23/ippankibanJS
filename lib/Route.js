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
    })

    return {
        constructor: function(type, detail){
            routes.set(this, Object.create(null))
            routes.get(this).type = typeOf(type) == "string" ? type : function(){ throw new TypeError(errors.UNSPECIFIED_EVENT_TYPE_ERR) }()
            routes.get(this).detail = typeOf(detail) == "object" ? (detail.hasOwnProperty(detail) ? detail.detail : detail)
                                    : detail && detail.length == 1 ? detail[0]
                                    : detail && detail.length > 1 ? [].concat(detail)
                                    : null
            routes.get(this).timestamp = Date.now()
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
      , preventDefault: { enumerable: true,
            value: function(){ routes.get(this).cancelled = true }
        }
      , state: { enumerable: true,
            get: function(){ return routes.get(this).state || module.exports.Route.UNINITIALIZED }
        }
      , stop: { enumerable: true,
            value: function(){
                routes.get(this).state = module.exports.Route.STOPPED
            }
        }
      , timestamp: { enumerable: true,
            get: function(){ return routes.get(this).timestamp }
        }
      , type: { enumerable: true,
            get: function(){ return routes.get(this).type }
        }
      , wait: { enumerable: true,
            value: function(fn){
                if ( typeOf(fn) == "function" )
                  routes.get(this).state = module.exports.Route.PAUSED,
                  routes.get(this).waitFor = new Promise(resolve => { fn(resolve) })
                    .then(()=>{
                        routes.get(this).state = module.exports.Route.INITIALIZED
                        delete routes.get(this).waitFor
                    })

                return routes.get(this).waitFor || Promise.resolve()
            }
        }

    }
})
