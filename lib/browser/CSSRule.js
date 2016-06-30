"use strict"

const errors = require("../errors")
const eventWM = require("../Event")._eventWM
const klass = require("../class").class
const typeOf = require("../type").type

const Event = require("../Event").Event
const LibNode = require("../Node").Node
const Serializer = require("../Serializer").Serializer
const UID = require("../UID").UID

const CSSEvt = klass(Event, statics => {
    const events = eventWM

    return {
        constructor: function(type, cssRule, from, to){
            Event.call(this, type)
            events.get(this).cssRule = cssRule
        }
      , cssRule: { enumerable: true,
            get: function(){ return events.get(this).cssRule }
        }
    }
})

const CSSTextResetEvt = klass(CSSEvt, {
    constructor: function(cssRule, from, to){
        CSSEvt.call(this, "csstextreset", cssRule)
    }
})

const CSSTextUpdateEvt = klass(CSSEvt, {
    constructor: function(cssRule, from, to){
        CSSEvt.call(this, "csstextupdate", cssRule)
    }
})

const CSSSelectorUpdateEvt = klass(CSSEvt, {
    constructor: function(cssRule, from, to){
        CSSEvt.call(this, "cssselectorupdate", cssRule)
    }
})

module.exports.CSSHook = klass(statics => {
    const csshooks = new WeakMap
    const hookedprops = new WeakMap

    const defaulthandler = function(v){
        return [{ property: this.property, value: v }]
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

module.exports._rulesWM = new WeakMap
module.exports.CSSRule = klass(LibNode, statics => {
    const cssrules = module.exports._rulesWM

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
            LibNode.call(this)
            cssrules.set(this, Object.create(null))
            cssrules.get(this).dummy = document.createElement("div")

            let fromstr = false
            cssrules.get(this).selectorText = args.length > 1 && typeOf(args[0]) == "string" && isNaN(+args[0]) ? args.shift()
                                         : args.length == 1 && typeOf(args[0]) == "string" ? (fromstr = true, (rcssparse.exec(args[0])||[])[1]||"")
                                         : (fromstr = true, args.shift(), (rcssparse.exec(args[0])||[])[1]||"")

            this.cssText = fromstr ? (rcssparse.exec(args.pop())||[])[2]||""
                         : typeOf(args[args.length-1]) == "string" ? args.pop()
                         : typeOf(args[args.length-1]) == "object" ? module.exports.CSSRule.serializeCssText(args.pop())
                         : ""
        }
      , cssText: { enumerable: true,
            get: function(){ return cssrules.get(this).dummy.style.cssText }
          , set: function(v){
                const from = cssrules.get(this).dummy.style.cssText
                cssrules.get(this).dummy.style.cssText = ""

                const props = module.exports.CSSRule.objectifyCssText(v)
                Object.keys(props).forEach(k => this.setProperty(k, props[k]))
                const to = cssrules.get(this).dummy.style.cssText

                if ( from !== to )
                  this.dispatchEvent(new CSSTextResetEvt(this, from, to))
            }
        }
      , getProperty: { enumerable: true,
            value: function(){
                return CSSStyleDeclaration.prototype.getPropertyValue.apply(cssrules.get(this).dummy.style, arguments)
            }
        }
      , selectorText: { enumerable: true,
            get: function(){ return cssrules.get(this).selectorText }
          , set: function(v) {
                const from = this.selectorText
                cssrules.get(this).selectorText = v

                if ( from && from !== "null" && from !== v )
                  this.dispatchEvent(new CSSSelectorUpdateEvt(this, from, v))
            }
        }
      , setProperty: { enumerable: true,
            value: function(prop, value){
                const from = this.getProperty(prop)

                module.exports.CSSHook.getHook(prop)
                .forEach(({transform}) => {
                  transform(value)
                    .forEach(({property, value})=>{
                        cssrules.get(this).dummy.style.setProperty(property, value)

                        const to = this.getProperty(prop)

                        if ( from !== to )
                          this.dispatchEvent(new CSSTextUpdateEvt(this, from, to))
                    })
                })
            }
        }
      , toString: { enumerable: true,
            value: function(){
                return `${this.selectorText}{${this.cssText}}`
            }
        }
    }
})
