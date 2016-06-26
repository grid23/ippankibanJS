"use strict"

const klass = require("../class").class
const typeOf = require("../type").type
const Event = require("../Event").Event
const EventTarget = require("../EventTarget").EventTarget
const Serializer = require("../Serializer").Serializer
const UID = require("../UID").UID

module.exports.CSSMediaRule = klass(EventTarget, statics => {

    return {
        constructor: function(){

        }
    }
})

module.exports.CSSRule = klass(EventTarget, statics => {
    const rules = new WeakMap
    const serializer = new Serializer({ delimiter: ":", separator: ";" })
    const rcssparse = /(?:\s|$)*([^{]*)(?:\s|$)*{(.*)}(?:\s|$)*/ // TODO make sure this behaves as expected

    Object.defineProperties(statics, {
        serializeCssText: { enumerable: true,
            value: o => serializer.serialize(o)
        }
      , objectifyCssText: { enumerable: true,
            value: str => serializer.objectify(str)
        }
    })

    return {
        constructor: function(...args){
            rules.set(this, Object.create(null))
            rules.get(this).dummy = document.createElement("div")

            let fromstr = false
            rules.get(this).selectorText = args.length > 1 && _.typeof(args[0]) == "string" && isNaN(+args[0]) ? args.shift()
                                         : args.length == 1 && _.typeof(args[0]) == "string" ? (fromstr = true, (rcssparse.exec(args[0])||[])[1]||"")
                                         : (fromstr = true, args.shift(), (rcssparse.exec(args[0])||[])[1]||"")

            rules.get(this).media = args.length > 1 && module.exports.CSSMediaRule.isImplementedBy(args[args.length-1]) ? args.pop()
                                  : args.length > 1 ? new module.exports.CSSMediaRule( args.pop() )
                                  : null

            rules.get(this).dummy.style.cssText = fromstr ? (rcssparse.exec(args.pop())||[])[2]||""
                                                : _.typeof(args[args.length-1]) == "string" ? args.pop()
                                                : _.typeof(args[args.length-1]) == "object" ? module.exports.CSSRule.serializeCssText(args.pop())
                                                : ""
        }
      , getProperty: { enumerable: true,
            value: function(){
                return CSSStyleDeclaration.prototype.getPropertyValue.apply(rules[this.uid].dummy.style, arguments)
            }
        }
      , setProperty: { enumerable: true,
            value: function(prop, value){
                
            }
        }
    }
})
