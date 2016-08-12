"use strict"

const errors = require("./errors")
const klass = require("../lib/class").class
const typeOf = require("../lib/type").typeOf

const Line = require("./Line").Line
const Point = require("./Point").Point

module.exports.Circle = klass(statics => {
    const circles = new WeakMap

    Object.defineProperties(statics, {
        incircle: { enumerable: true,
            value: function(a, b, c){
                const bc = new Line(b, c).length
                const ac = new Line(a, c).length
                const ab = new Line(a, b).length

                const p = bc + ac + ab
                const x = (bc*a.x + ac*b.x + ab*c.x)/p
                const y = (bc*a.y + ac*b.y + ab*c.y)/p
                const hp = p/2

                const area = Math.sqrt( hp*(hp-bc)*(hp-ac)*(hp-ab) )
                const radius = (2*area)/p

                return new module.exports.Circle(new Point(x, y), radius)
            }
        }
      , incenter: { enumerable: true,
            value: function(a, b, c){
                const bc = new Line(b, c).length
                const ac = new Line(a, c).length
                const ab = new Line(a, b).length

                const p = bc + ac + ab
                const x = (bc*a.x + ac*b.x + ab*c.x)/p
                const y = (bc*a.y + ac*b.y + ab*c.y)/p

                return new Point(x, y)
            }
        }
    })

    return {
        constructor: function(c, radius){
            circles.set(this, Object.create(null))
            this.center = c
            this.radius = radius
        }
      , center: { enumerable: true,
            get: function(){ return circles.get(this).c }
          , set: function(v){
                if ( !Point.isImplementedBy(v) )
                  throw new TypeError(errors.NOT_A_POINT)

                circles.get(this).c = v
            }
        }
      , radius: { enumerable: true,
            get: function(){ return circles.get(this).radius }
          , set: function(v){
                if ( typeOf(v) !== "number" )
                  throw new TypeError(errors.NOT_A_NUMBER)
                circles.get(this).radius = v
            }
        }
    }
})
