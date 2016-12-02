"use strict"

const errors = require("./errors")
const klass = require("./class").class
const typeOf = require("./type").type

module.exports.Serializer = klass(statics => {
    const serializers = new WeakMap
    const DELIMITER = "="
    const SEPARATOR = "&"
    const KEY_SEPARATOR = "."

    const rspacetoplus = /%20/g
    const rplustospace = /\+/g

    Object.defineProperties(statics, {
        objectify: { enumerable: true,
            value: (s, opts = {}) => {
                let o = {}
                let del = opts.delimiter || DELIMITER
                let sep = opts.separator || SEPARATOR
                let keys = Object.keys(o)
                s = s.search(sep) != -1 ? s.split(sep) : s.length ? [s] : []

                for ( let pair of s ) {
                    pair = unescape(pair.replace(rplustospace, "%20"))
                    let idx = pair.indexOf(del)
                    let key = pair.split(del, 1)[0]
                    let value = pair.slice(idx+1)

                    if ( idx != -1 )
                      o[key.trim()] = value
                    else
                      o[pair] = true
                }

                return o
            }
        }
      , serialize: { enumerable: true,
            value: (o, opts = {}) => {
                let s = []
                let del = opts.delimiter || DELIMITER
                let sep = opts.separator || SEPARATOR

                for ( let k in o )
                  s.push( `${escape(k)}${del}${encodeURIComponent(o[k])}` )

                return s.join(sep)
            }
        }
      , stringify: { enumerable: true,
            value: (o, opts = {}) => {
                let s = []
                let del = opts.delimiter || DELIMITER
                let sep = opts.separator || SEPARATOR

                for ( let k in o )
                  s.push( `${escape(k)}${del}${o[k]}` )

                return s.join(sep)
            }
        }
    })

    return {
        constructor: function(dict = {}){
            serializers.set(this, new Map)

            if ( dict.separator ) this.separator = dict.separator
            if ( dict.delimiter ) this.delimiter = dict.delimiter
            if ( dict.key_separator ) this.key_separator = dict.key_separator
        }
      , delimiter: { enumerable: true,
            get: function(){ return serializers.get(this).get("delimiter") }
          , set: function(v){ serializers.get(this).set("delimiter", v) }
        }
      , objectify: { enumerable: true,
            value: function(s){
                return module.exports.Serializer.objectify(s, this)
            }
        }
      , key_separator: { enumerable: true,
            get: function(){ return serializers.get(this).get("key_separator") }
          , set: function(v){ serializers.get(this).set("key_separator", v) }
        }
      , separator: { enumerable: true,
            get: function(){ return serializers.get(this).get("separator") }
          , set: function(v){ serializers.get(this).set("separator", v) }
        }
      , serialize: { enumerable: true,
            value: function(o){
                return module.exports.Serializer.serialize(o, this)
            }
        }
      , stringify: {
            value: function(o){
                return module.exports.Serializer.stringify(o, this)
            }
        }
    }
})
