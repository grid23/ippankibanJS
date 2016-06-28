"use strict"

const errors = require("../errors")
const klass = require("../class").class
const typeOf = require("../type").type

const Event = require("../Event").Event
const LibNode = require("../Node").Node
const Serializer = require("../Serializer").Serializer
const UID = require("../UID").UID

module.exports.CSSHook = klass(statics => {
    const csshooks = new WeakMap
    const hookedprops = new WeakMap

    const defaulthandler = function(v){
        return `${this.property}:${v}`
    }

    Object.defineProperties(statics, {
        getHook: { enumerable: true,
            value: property => {
                if ( hookedprops.has(property) )
                  return [...hookedprops.get(property)]
                else return [{transform: defaulthandler.bind({property})}]
            }
        }
    })

    return {
        constructor: function(property, prophandler=defaulthandler) {
            if ( typeOf(property) !== "string" )
              throw new TypeError(errors.TODO) //TODO
            if ( typeOf(prophandler) !== "function" )
              throw new TypeError(errors.TODO) //TODO

            csshooks.set(this, Object.create(null))
            csshooks.get(this).property = property
            csshooks.get(this).prophandler = prophandler

            if ( !hookedprops.has(property) )
              hookedprops.set(property, new Set)
            hookedprops.get(property).add(this)
        }
      , property: { enumerable: true,
            get: function(){
                return csshooks.get(this).property
            }
        }
      , transform: { enumerable: true,
            value: function(v){
                return this.csshooks.get(this).prophandler.call(this, v)
            }
        }
    }
})

module.exports.CSSRule = klass(LibNode, statics => {
    const cssrules = new WeakMap

    const rcssparse = /(?:\s|$)*([^{]*)(?:\s|$)*{(.*)}(?:\s|$)*/
    const serializer = new Serializer({ delimiter: ":", separator: ";" })

    Object.defineProperties(statics, {
        serializeCssText: { enumerable: true,
            value: o => serializer.stringify(o)
        }
      , objectifyCssText: { enumerable: true,
            value: str => serializer.objectify(str)
        }
      , hook: { enumerable: true,
            value: function(...args){
                const csshook = module.exports.CSSHook.isImplementedBy(args[0])
                              ? args[0]
                              : new module.exports.CSSHook(args[0], args[1])

            }
        }
    })

    return {
        constructor: function(...args){
            cssrules.set(this, Object.create(null))
            cssrules.get(this).dummy = document.createElement("div")

            let fromstr = false
            cssrules.get(this).selectorText = args.length > 1 && typeOf(args[0]) == "string" && isNaN(+args[0]) ? args.shift()
                                         : args.length == 1 && typeOf(args[0]) == "string" ? (fromstr = true, (rcssparse.exec(args[0])||[])[1]||"")
                                         : (fromstr = true, args.shift(), (rcssparse.exec(args[0])||[])[1]||"")

            const _props = fromstr ? module.exports.CSSRule.objectifyCssText((rcssparse.exec(args.pop())||[])[2]||"")
                      : typeOf(args[args.length-1]) == "object" ? args.pop()
                      : typeOf(args[args.length-1]) == "string" ? module.exports.CSSRule.objectifyCssText(args.pop())
                      : {}
            const props = []

            Object.keys(_props).forEach( k => module.exports.CSSHook.getHook(k).forEach( ({transform}) => props.push(transform(_props[k])) ) ) //one liner!

            /*
            cssrules.get(this).media = args.length > 1 && module.exports.CSSMediaRule.isImplementedBy(args[args.length-1]) ? args.pop()
                                  : args.length > 1 ? new module.exports.CSSMediaRule( args.pop() )
                                  : null
            */

            this.cssText = props.join(";")
            cssrules.get(this).CSS2Properties = cssrules.get(this).dummy.style.CSS2Properties
        }
      , getProperty: { enumerable: true,
            value: function(){
                return CSSStyleDeclaration.prototype.getPropertyValue.apply(cssrules.get(this).dummy.style, arguments)
            }
        }
      , setProperty: { enumerable: true,
            value: function(prop, value){

            }
        }
    }
})
