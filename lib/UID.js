"use strict"

const errors = require("./errors")
const klass = require("./class").class
const typeOf = require("./type").type

module.exports.UID = klass(statics => {
    const generators = new WeakMap

    Object.defineProperties(statics, {
        CHARS: { enumerable: true,
            value: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
        }
      , MAP: { enumerable: true,
            value: "Fxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
        }
      , RADIX: { enumerable: true,
            value: 16
        }
      , REGEXP: { enumerable: true,
            value: /[xy]/g
        }
      , uid: { enumerable: true,
            value: dict => {
                return new module.exports.UID(dict).generate()
            }
        }
    })

    return {
        constructor: function(){
              let dict = typeOf(arguments[0]) === "object" ? arguments[0] : {}

              generators.set(this, Object.create(null))
              if ( dict.chars ) generators.get(this).chars = dict.chars
              if ( dict.map ) generators.get(this).map = dict.map
              if ( dict.radix ) generators.get(this).radix = dict.radix
              if ( dict.regexp ) generators.get(this).regexp = dict.regexp
        }
      , chars: { enumerable: true,
            get: function(){
                return generators.get(this).chars || module.exports.UID.CHARS
            }
        }
      , generate: { enumerable: true,
            value: function(){
                return this.map.replace(this.regexp, function(c, r){
                    r = (Date.now() + Math.random()*this.radix)%this.radix |0
                    if ( c === "y") r = (r & 0x3)|0x8
                    return this.chars[r]
                }.bind(this))
            }
        }
      , map: { enumerable: true,
            get: function(){
                return generators.get(this).map || module.exports.UID.MAP
            }
        }
      , radix: { enumerable: true,
            get: function(){
                return generators.get(this).radix || module.exports.UID.RADIX
            }
        }
      , regexp: { enumerable: true,
            get: function(){
                return generators.get(this).regexp || module.exports.UID.REGEXP
            }
        }
    }
})
