"use strict"

const errors = require("./errors")
const klass = require("../lib/class").class
const typeOf = require("../lib/type").typeOf

module.exports.Point = klass(statics => {
    const points = new WeakMap

    return {
        constructor: function(x, y){
            points.set(this, Object.create(null))
            this.x = x
            this.y = y
        }
      , x: { enumerable: true,
            get: function(){ return points.get(this).x }
          , set: function(v){
                if ( typeOf(v) !== "number" )
                  throw new TypeError(errors.NOT_A_NUMBER)
                points.get(this).x = v
            }
        }
      , y: { enumerable: true,
            get: function(){ return points.get(this).y }
          , set: function(v){
                if ( typeOf(v) !== "number" )
                  throw new TypeError(errors.NOT_A_NUMBER)
                points.get(this).y = v
            }
        }
    }
})
