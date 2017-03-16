"use strict"

const html_beautify = require('js-beautify').html
const errors = require("../errors")
const klass = require("../class").class
const typeOf = require("../type").typeof

const Event = require("../Event").Event
const LibNode = require("../Node").Node
const ZExpression = require("../ZParser").ZExpression
const Model = require("../Model").Model
const UID = require("../UID").UID
const ZParser = require("../ZParser").ZParser

module.exports.View = klass(LibNode, statics => {
    const def_parser = new ZParser
    const views = new WeakMap

    const nodeproxy = {
        get: (o, p) => {
            return o.query(p)
        }
    }

    const nodesproxy = {
        get: (o, p) => {
            return o.queryAll(p)
        }
    }

    Object.defineProperties(statics, {
        appendChild: { enumerable: true,
            value: (node, target) => node.appendChild(target)
        }
      , contains: { enumerable: true,
            value: function(){}
        }
      , insertAfter: { enumerable: true,
            value: (node, target) => node.nextSibling.insertBefore(target)
        }
      , insertBefore: { enumerable: true,
            value: (node, target) => node.insertBefore(target)
        }
      , prependChild: { enumerable: true,
            value: (node, target) => node.insertBefore(target, node.children[0])
        }
      , removeChild: { enumerable: true,
            value: function(){}
        }
      , replaceChild: { enumerable: true,
            value: function(){}
        }
      , BUSY: { enumerable: true,
            value: 0
        }
      , READY: { enumerable: true,
            value: 1
        }
    })

    return {
        constructor: function(...args){
            LibNode.call(this)
            views.set(this, new Map)

            views.get(this).set("model", Model.isImplementedBy( args[args.length-1] ) ? args.pop()
                              : typeOf(args[args.length-1]) == "object" ? new this.Model(args.pop())
                              : new this.Model)
            views.get(this).set("expression", ZExpression.isImplementedBy(args[args.length-1]) ? args.pop()
                               : typeOf(args[args.length-1]) == "string" ? new ZExpression(args.pop())
                               : !!this.template ? new ZExpression(this.template)
                               : new ZExpression)

            views.get(this).set("zen", this.parser !== def_parser && ZParser.isImplementedBy(this.parser) ? this.parser.parse(this.expression, this.model)
                                : ZParser.parse(this.expression, this.model))

            this.addEventListener("ready", e => {
                if ( this.readyState == module.exports.View.BUSY  )
                  e.stop()
            }, true)

            views.get(this).get("zen").addEventListener("ready", e => this.dispatchEvent(e))

            views.get(this).set("fragment", views.get(this).get("zen").tree)
            views.get(this).set("refs", views.get(this).get("zen").refs)

        }
      , appendAt: { enumerable: true,
            value: function(at, child){
                const node = this.node[at] || function(){ throw new ReferenceError(errors.TODO) }()
                let sub = null

                child = module.exports.View.isImplementedBy(child) && typeOf(child) == "instance" ? (sub = child, child.fragment)
                      : module.exports.View.isImplementedBy(child) && typeOf(child) == "function" ? (sub = new child(this.model), sub.fragment)
                      : child && [Node.TEXT_NODE, Node.DOCUMENT_FRAGMENT_NODE, Node.ELEMENT_NODE].indexOf(child.nodeType) > -1 ? child
                      : function(){ throw new TypeError(errors.TODO) }()

                if ( sub ) this.appendChild(sub) // ippankiban node
                module.exports.View.appendChild(node, child)

                return sub
            }
        }
      , expression: { enumerable: true,
            get: function(){ return views.get(this).get("expression") }
        }
      , fragment: { enumerable: true,
            get: function(){ return views.get(this).get("fragment") }
        }
      , insertAfterAt: { enumerable: true,
            value: function(at, child){
                const node = this.node[at] || function(){ throw new ReferenceError(errors.TODO) }()
                let sub = null

                child = module.exports.View.isImplementedBy(child) && typeOf(child) == "instance" ? (sub = child, child.fragment)
                      : module.exports.View.isImplementedBy(child) && typeOf(child) == "function" ? (sub = new child(this.model), sub.fragment)
                      : child && [Node.TEXT_NODE, Node.DOCUMENT_FRAGMENT_NODE, Node.ELEMENT_NODE].indexOf(child.nodeType) > -1 ? child
                      : function(){ throw new TypeError(errors.TODO) }()

                if ( sub ) this.appendChild(sub) // ippankiban node
                module.exports.View.InsertAfter(node, child)

                return sub
            }
        }
      , insertBeforeAt: { enumerable: true,
            value: function(at, child){
                const node = this.node[at] || function(){ throw new ReferenceError(errors.TODO) }()
                let sub = null

                child = module.exports.View.isImplementedBy(child) && typeOf(child) == "instance" ? (sub = child, child.fragment)
                      : module.exports.View.isImplementedBy(child) && typeOf(child) == "function" ? (sub = new child(this.model), sub.fragment)
                      : child && [Node.TEXT_NODE, Node.DOCUMENT_FRAGMENT_NODE, Node.ELEMENT_NODE].indexOf(child.nodeType) > -1 ? child
                      : function(){ throw new TypeError(errors.TODO) }()

                if ( sub ) this.appendChild(sub) // ippankiban node
                module.exports.View.InsertBefore(node, child)

                return sub
            }
        }
      , Model: { enumerable: true, configurable: true,
            value: Model
        }
      , model: { enumerable: true,
            get: function(){ return views.get(this).get("model") }
        }
      , node: { enumerable: true,
            get: function(){
                if ( !views.get(this).has("nodeproxy") )
                  views.get(this).set("nodeproxy", new Proxy(this, nodeproxy))
                return views.get(this).get("nodeproxy")
            }
        }
      , nodes: { enumerable: true,
            get: function(){
                if ( !views.get(this).has("nodesproxy") )
                  views.get(this).set("nodesproxy", new Proxy(this, nodesproxy))
                return views.get(this).get("nodesproxy")
            }
        }
      , parser: { enumerable: true, configurable: true,
            value: def_parser
        }
      , prependAt: { enumerable: true, configurable: true,
            value: function(at, child){
                const node = this.node[at] || function(){ throw new ReferenceError(errors.TODO) }()
                let sub = null

                child = module.exports.View.isImplementedBy(child) && typeOf(child) == "instance" ? (sub = child, child.fragment)
                      : module.exports.View.isImplementedBy(child) && typeOf(child) == "function" ? (sub = new child(this.model), sub.fragment)
                      : child && [Node.TEXT_NODE, Node.DOCUMENT_FRAGMENT_NODE, Node.ELEMENT_NODE].indexOf(child.nodeType) > -1 ? child
                      : function(){ throw new TypeError(errors.TODO) }()

                if ( sub ) this.appendChild(sub) // ippankiban node
                module.exports.View.prependChild(node, child)

                return sub
            }
        }
      , query: { enumerable: true,
            value: function(ref){
                return this.refs.hasOwnProperty(ref) ? [...this.refs[ref]][0] : null
            }
        }
      , queryAll: { enumerable: true,
            value: function(ref){
                return this.refs.hasOwnProperty(ref) ? [...this.refs[ref]] : null
            }
        }
      , readyState: { enumerable: true,
            get: function(){
                if ( !views.get(this).get("zen").ready )
                  return module.exports.View.BUSY

                const children = this.childNodes
                for ( let i = 0; i < children.length; i += 1 ) {
                    if ( views.has(children[i]) && children[i].readyState == module.exports.View.BUSY )
                      return module.exports.View.BUSY
                }

                return module.exports.View.READY
            }
        }
      , recover: { enumerable: true,
            value: function(){
                this.nodes.root.forEach(node => this.fragment.appendChild(node))
            }
        }
      , refs: { enumerable: true,
            get: function(){ return views.get(this).get("refs") }
        }
      , root: { enumerable: true,
            get: function(){
                let nodes = this.queryAll("root")

                if ( nodes.length === 1 )
                  return nodes[0]
                else
                  return this.fragment
            }
        }
      , template: { enumerable: true, configurable: true,
            value: ""
        }
      , toString: { enumerable: true,
            value: function({ beautify=false, unformatted=[] } = {}){
                const childNodes = Array.prototype.slice.call(this.fragment.childNodes)

                if ( beautify )
                  return (html_beautify([...childNodes].map(node => node.outerHTML).join(""), { unformatted }))
                else
                  return [...childNodes].map(node => node.outerHTML).join("")
            }
        }
      , uid: { enumerable: true,
            get: function(){
                if ( !views.get(this).has("uid") )
                  views.get(this).set("uid", UID.uid())

                return views.get(this).get("uid")
            }
        }
    }
})
