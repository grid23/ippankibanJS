"use strict"

const errors = require("../errors")
const klass = require("../class").class
const typeOf = require("../type").type

const CSSRule = require("../CSSRule").CSSRule
const Event = require("../Event").Event
const LibNode = require("../Node").Node
const Serializer = require("../Serializer").Serializer
const UID = require("../UID").UID

module.exports._conditionalWM = new WeakMap
module.exports.CSSConditionalRule = klass(LibNode, statics => {
    const conditionals = module.exports._conditionalWM
    const rconditional = /^\@(document|supports|media)([^\{]*)\{(.*)\}/i
    const updaters_text = new WeakMap

    return {
        constructor: function(condition = ""){
            LibNode.call(this)

            const atrule = rconditional.exec(condition)
            const type = atrule[1]
            const conditionText = atrule[2]
            const cssText = atrule[3]

            if ( !type || !conditionText )
              throw new TypeError(errors.TODO)

            conditionals.set(this, new Map)
            conditionals.get(this).set("type", type)
            conditionals.get(this).set("conditionText", conditionText)
            conditionals.get(this).set("baseCssText", cssText.trim())

            conditionals.get(this).set("sync", false)
            conditionals.get(this).set("rules", [])
            conditionals.get(this).set("buffer_rules", [])
            conditionals.get(this).set("at_sheet", [])
            conditionals.get(this).set("add", rule => {
                conditionals.get(this).get("at_sheet").push(rule)
                conditionals.get(this).set("active", true)

                this.insertRule(conditionals.get(this).get("buffer_rules"))
            })
            conditionals.get(this).set("remove", rule => {
                let idx = conditionals.get(this).get("at_sheet")

                if ( idx !== -1 )
                  conditionals.get(this).get("at_sheet").splice(idx, 1)

                if ( !conditionals.get(this).get("at_sheet").length )
                  conditionals.get(this).set("active", false)
            })
        }
      , cssText: { enumerable: true,
            get: function(){
                if ( conditionals.get(this).get("active") )
                  return conditionals.get(this).get("at_sheet")[0].cssText
                return conditionals.get(this).get("baseCssText")
            }
        }
      , deleteRule: { enumerable: true,
            value: function(...args){
                const rules = args[0][Symbol.iterator] ? args.shift()
                            : args.length ? args
                            : []

                return Promise.resolve().then(()=> {
                    rules.forEach(rule => {
                        let is_rule = false
                        let is_conditional = false

                        rule = CSSRule.isImplementedBy(rule) ? (is_rule = true, rule)
                             : module.exports.CSSConditionalRule.isImplementedBy(rule) ? (is_conditional = true, rule)
                             : null

                        if ( !rule )
                          return

                        if ( !conditionals.get(this).get("active") ) {
                            let idx

                            while ( idx = conditionals.get(this).get("buffer_rules").indexOf(rule), idx !== -1 )
                              conditionals.get(this).get("buffer_rules").splice(idx, 1)
                        } else {
                            if ( is_rule ) {
                                conditionals.get(this).get("at_sheet").forEach(cond_rule => {
                                    let idx = -1

                                    while ( idx = conditionals.get(this).get("rules").indexOf(rule), idx != -1 )
                                      cond_rule.deleteRule(idx),
                                      conditionals.get(this).get("rules").splice(idx, 1)

                                    while ( idx = conditional.get(this).buffer_rules.indexOf(rule), idx != -1 )
                                      conditionals.get(this).get("buffer_rules").splice(idx, 1)
                                })

                                if ( updaters_text.has(rule) )
                                    rule.removeEventListener("csstextupdate", updaters_text.get(rule)),
                                    updaters_text.delete(rule)
                            } else if ( is_conditional ){
                                conditionals.get(this).get("at_sheet").forEach(cond_rule => {
                                    let idx = -1
                                    while ( idx = conditionals.get(this).get("rules").indexOf(rule), idx != -1 ) {
                                        conditionals.get(rule).get("remove")( cond_rule.cssRules[idx] )
                                        cond_rule.deleteRule(idx)
                                        conditionals.get(this).get("rules").splice(idx, 1)
                                    }

                                    while ( idx = conditionals.get(this).get("buffer_rules").indexOf(rule), idx != -1 )
                                      conditionals.get(this).get("buffer_rules").splice(idx, 1)
                                })
                            }
                        }
                    })
                })
            }
        }
      , condition: { enumerable: true,
            get: function(){ return conditionals.get(this).get("type") }
        }
      , conditionText: { enumerable: true,
            get: function(){ return conditionals.get(this).get("conditionText") }
        }
      , insertRule: { enumerable: true,
            value: function(...args){
                const rules = args[0][Symbol.iterator] ? args.shift()
                            : args.length ? args
                            : []

                return Promise.resolve().then(()=> {
                    rules.forEach(rule => {
                        let is_rule = false
                        let is_conditional = false

                        rule = CSSRule.isImplementedBy(rule) ? (is_rule = true, rule)
                             : module.exports.CSSConditionalRule.isImplementedBy(rule) ? (is_conditional = true, rule)
                             : (is_rule = true, new CSSRule(rule))

                        conditionals.get(this).get("buffer_rules").push(rule)

                        if ( conditionals.get(this).get("active") ) {
                            if ( is_rule ) {
                                let idx = -1
                                conditionals.get(this).get("at_sheet").forEach(cond_rule => {
                                    if ( idx == -1 )
                                      idx = cond_rule.cssRules.length,
                                      conditionals.get(this).get("rules")[idx] = rule

                                    cond_rule.insertRule(rule.toString(), idx)
                                })

                                if ( !updaters_text.has(rule) )
                                  updaters_text.set(rule, ({cssRule}) => {
                                      conditionals.get(this).get("at_sheet").forEach(cond_rule => {
                                          let idxs = []
                                          conditionals.get(this).get("rules").forEach((rule, idx) => {
                                              if ( rule === cssRule ) idxs.push(idx)
                                          })
                                          idxs.forEach(idx => cond_rule.cssRules[idx].style.cssText = cssRule.cssText)
                                      })
                                  })

                                rule.addEventListener("csstextupdate", updaters_text.get(rule))
                            } else if ( is_conditional ){
                                let idx = -1
                                conditionals.get(this).get("at_sheet").forEach(cond_rule => {
                                    if ( idx == -1 )
                                        idx = cond_rule.cssRules.length,
                                        conditionals.get(this).get("rules")[idx] = rule

                                    cond_rule.insertRule(rule.toString(), idx)
                                    conditionals.get(rule).get("add")( cond_rule.cssRules[idx] )
                                })
                            }
                        }

                    })
                })
            }
        }
      , toString: { enumerable: true,
            value: function(){
                return `@${this.condition}${this.conditionText}{${this.cssText}}`
            }
        }

    }
})
