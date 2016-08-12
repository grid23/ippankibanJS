"use strict"

const errors = require("./errors")
const klass = require("../lib/class").class
const typeOf = require("../lib/type").typeOf

const Point = require("./Point").Point

module.exports.Line = klass(statics => {
    const lines = new WeakMap

    Object.defineProperties(statics, {
        intersectAt: { enumerable: true,
            value: function({slope:m1, yintercept:y1, a:{x:x1}}, {slope:m2, yintercept:y2, a:{x:x2}}){
                let x=0, y=0
                if ( !isNaN(m1) && !isNaN(m2) ) {
                    x = (y2-y1)/(m1+(-m2))
                    y = (m1*x) + y1
                }
                else if ( isNaN(m1) ) {
                    x = x1
                    y = m2*x1 + y2
                }
                else if ( isNaN(m2) ) {
                    x = x2
                    y = m1*x2 + y1
                }

                return new Point(x, y)
            }
        }
    })

    return {
        constructor: function(a, b){
            lines.set(this, Object.create(null))
            this.a = a
            this.b = b
        }
      , a: { enumerable: true,
            get: function(){ return lines.get(this).a }
          , set: function(v){
                if ( !Point.isImplementedBy(v) )
                  throw new TypeError(errors.NOT_A_POINT)
                lines.get(this).a = v
            }
        }
      , b: { enumerable: true,
            get: function(){ return lines.get(this).b }
          , set: function(v){
                if ( !Point.isImplementedBy(v) )
                  throw new TypeError(errors.NOT_A_POINT)
                lines.get(this).b = v
            }
        }
      , length: { enumerable: true,
            get: function(){
                const {a,b} = this
                return Math.sqrt((b.x-a.x)*(b.x-a.x) + (b.y-a.y)*(b.y-a.y))
            }
        }
      , midpoint: { enumerable: true,
            get: function(){
                const {a:{x:x1, y:y1}, b:{x:x2, y:y2}} = this

                const x = (x1+x2)/2
                const y = (y1+y2)/2

                return new Point(x, y)
            }
        }
      , pointAt: { enumerable: true,
            value: function(at){
                const { slope, yintercept, a:{x:x1,y:y1}, b:{x:x2,y:y2} } = this
                at = (+at)/100

                const x = isNaN(slope) ? x1 : x1 + (x2-x1) * at
                const y = isNaN(slope) ? y1 + (y2-y1) * at
                        : slope*x + yintercept

                return new Point(x, y)
            }
        }
      , slope: { enumerable: true,
            get: function(){
                const {a, b} = this
                if ( a.y === b.y )
                  return 0 // slope of horizontal lines is 0
                if ( a.x === b.x )
                  return NaN // vertical lines have no slope
                return ( a.y - b.y ) / ( a.x - b.x)
            }
        }
      , yintercept: { enumerable: true,
            get: function(){
                const { a:{y, x}, slope:m } = this
                return  y - m*x
            }
        }
    }
})
