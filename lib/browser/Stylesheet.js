"use strict"

const cancelAnimationFrame = require("../cancelAnimationFrame").cancelAnimationFrame
const cssProperties = window.getComputedStyle(document.createElement("div"))
const domready = require("../domready")
const isSameDomain = require("../isSameDomain").isSameDomain
const klass = require("../class").class
const rconditional = require("../CSSConditionalRule")._rconditional
const requestAnimationFrame = require("../requestAnimationFrame").requestAnimationFrame
const typeOf = require("../type").typeOf

const conditionalWM = require("../CSSConditionalRule")._conditionalWM
const rulesWM = require("../CSSRule")._rulesWM

const CSSConditionalRule = require("../CSSConditionalRule").ConditionalRule
const CSSRule = require("../CSSRule").CSSRule
const Event = require("../Event").Event
const EventTarget = require("../EventTarget").EventTarget
const Serializer = require("../Serializer").Serializer
const UID = require("../UID").UID
const ZParser = require("../ZParser").ZParser

module.exports.Stylesheet = klass(EventTarget, statics => {
    const stylesheets = new WeakMap
    const updaters_text = new WeakMap

    Object.defineProperties(statics, {
        isLocalFile: { enumerable: true,
            value: isSameDomain
        }
    })

    return {
        constructor: function(...args){
            stylesheets.set(this, Object.create(null))

            const rules =typeOf(args[args.length-1]) == "array" ? [].concat(args.pop()) : []
            const dict = typeOf(args[args.length-1]) == "object" ? args.pop() : { node: args.pop() }

            stylesheets.get(this).uid = typeOf(dict.id) == "string" ? dict.id : UID.uid()
            stylesheets.get(this).writable = true
            stylesheets.get(this).rules = []

            stylesheets.get(this).node = function(node){
                if ( node && node.nodeType === Node.ELEMENT_NODE
                     && ["STYLE", "LINK"].indexOf(node.nodeName) !== -1 )
                  return node

                if ( typeOf(node) == "string" ) {
                    if ( !module.exports.Stylesheet.isLocalFile(node) )
                      stylesheets.get(this).writable = false
                    const href = node
                    node = ZParser.parse(`link#${stylesheets.get(this).uid}[rel=stylesheet][href=${href}]`).tree.childNodes[0]
                }
                else {
                    node = ZParser.parse(`style#${stylesheets.get(this).uid}`).tree.childNodes[0]
                    node.appendChild( document.createTextNode( rules.splice(0).join("\n") ) )
                }

                if ( dict.media )
                  node.setAttribute("media", dict.media)

                domready.then(({nodes}) => {
                    nodes.head.appendChild(node)

                    requestAnimationFrame(hrt=>{
                        if ( !!dict.disabled )
                          node.disabled = true
                    })
                })

                return node
            }.call(this, dict.node||dict.href||void 0)

            stylesheets.get(this).ready = new Promise((resolve, reject) => {
                const onload = e => {
                    if ( stylesheets.get(this).writable && rules && !!rules.length )
                      this.insertRule(rules)

                    resolve(stylesheets.get(this).writable)
                    stylesheets.get(this).sheet = stylesheets.get(this).node.sheet
                    this.dispatchEvent("ready", stylesheets.get(this).sheet)
                }

                if ( "msSetImmediate" in window ) // no events for <style> on ie
                  msSetImmediate(onload)
                else
                  stylesheets.get(this).node.addEventListener("load", onload),
                  stylesheets.get(this).node.addEventListener("error", function(e){
                      this.dispatchEvent("error", e)
                      reject(e)
                  })
            })
        }
      , deleteRule: { enumerable: true,
            value: function(...args){
                const rules = args[0][Symbol.iterator] ? args.shift()
                            : args.length ? args
                            : []

                return stylesheets.get(this).ready.then(writable => {
                    if ( !writable )
                      return this.dispatchEvent("error", new Error(errors.STYLESHEET_NOT_WRITABLE))

                    rules.forEach(rule => {
                        let is_rule = false
                        let is_conditional = false

                        rule = CSSRule.isImplementedBy(rule) ? (is_rule = true, rule)
                             : CSSConditionalRule.isImplementedBy(rule) ? (is_conditional = true, rule)
                             : null

                        if ( !rule )
                          return

                        if ( is_rule ) {
                            if ( updaters_text.has(rule) )
                              rule.removeEventListener("csstextupdate", updaters_text.get(rule)),
                              updaters_text.delete(rule)

                              let idx = -1
                              while ( idx = stylesheets.get(this).rules.indexOf(rule), idx != -1 )
                                stylesheets.get(this).sheet.deleteRule(idx),
                                stylesheets.get(this).rules.splice(idx, 1)


                        }
                        else if ( is_conditional ){

                        }
                    })
                })
            }
        }
      , disable: { enumerable: true,
            value: function(){

            }
        }
      , enable: { enumerable: true,
            value: function(){}
        }
      , insertRule: { enumerable: true,
            value: function(...args){
                const rules = args[0][Symbol.iterator] ? args.shift()
                            : args.length ? args
                            : []

                return stylesheets.get(this).ready.then(writable => {
                    if ( !writable )
                      return this.dispatchEvent( "error", new Error(errors.STYLESHEET_NOT_WRITABLE) )

                    rules.forEach(rule => {
                        let is_rule = false
                        let is_conditional = false

                        rule = CSSRule.isImplementedBy(rule) ? (is_rule = true, rule)
                             : CSSConditionalRule.isImplementedBy(rule) ? (is_conditional = true, rule)
                             : (is_rule = true, new CSSRule(rule))

                        const idx = stylesheets.get(this).sheet.cssRules.length
                        stylesheets.get(this).rules[idx] = rule

                        if ( is_rule ) {
                            stylesheets.get(this).sheet.insertRule(rule.toString(), idx)

                            if ( !updaters_text.has(rule) )
                              updaters_text.set(rule, ({cssRule}) => {
                                  let idxs = []
                                  stylesheets.get(this).rules.forEach((rule, idx) => {
                                      if ( rule === cssRule ) idxs.push(idx)
                                  })
                                  idxs.forEach(idx => stylesheets.get(this).sheet.cssRules[idx].style.cssText = cssRule.cssText)
                              })

                            rule.addEventListener("csstextupdate", updaters_text.get(rule))
                        }
                        else if ( is_conditional ){

                        }
                    })
                })
            }
        }
      , media: { enumerable: true,
            get: function(){ return stylesheets.get(this).node.getAttribute("media") }
          , set: function(v){ stylesheets.get(this).node.setAttribute("media", v) }
        }
      , node: { enumerable: true,
            get: function(){ return stylesheets.get(this).node }
        }
      , sheet: { enumerable: true,
            get: function(){ return stylesheets.get(this).node.sheet }
        }
    }
})
