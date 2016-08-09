"use strict"

const errors = require("../errors").errors
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
            value: function(){}
        }
      , contains: { enumerable: true,
            value: function(){}
        }
      , insertBefore: { enumerable: true,
            value: function(){}
        }
      , removeChild: { enumerable: true,
            value: function(){}
        }
      , replaceChild: { enumerable: true,
            value: function(){}
        }
    })

    return {
        constructor: function(...args){
            LibNode.call(this)
            views.set(this, Object.create(null))

            views.get(this).model = Model.isImplementedBy( args[args.length-1] ) ? args.pop()
                                  : typeOf(args[args.length-1]) == "object" ? new this.Model(args.pop())
                                  : new this.Model
            views.get(this).expression = ZExpression.isImplementedBy(args[args.length-1]) ? args.pop()
                           : typeOf(args[args.length-1]) == "string" ? new ZExpression(args.pop())
                           : !!this.template ? new ZExpression(this.template)
                           : new ZExpression

            views.get(this).zen = this.parser !== def_parser && ZParser.isImplementedBy(this.parser) ? this.parser.parse(this.expression, this.model)
                                : ZParser.parse(this.expression, this.model)

            this.appendChild(views.get(this).zen)

            views.get(this).fragment = views.get(this).zen.tree
            views.get(this).refs = views.get(this).zen.refs

        }
      /*, appendAt: { enumerable: true,
            value: function(ref, view, childNode){
                let target = this.query(ref) || function(){ throw new TypeError(errors.TODO) }() //TODO

                view = module.exports.ZView.isImplementedBy(view) && typeOf(view) == "instance" ? view
                     : module.exports.ZView.isImplementedBy(view) && typeOf(view) == "function" ? new view(this.model)
                     : typeOf(view) == "string" ? new module.exports.ZView(view, this.model)
                     : function(){ throw new TypeError(errors.TODO) }() //TODO

                childNode = typeOf(childNode) === "boolean" ? childNode : true

                if ( childNode && view.model !== this.model )
                  this.model.appendChild(view.model)

                target.appendChild(view.fragment)

                return view
            }
        }*/
      , expression: { enumerable: true,
            get: function(){ return views.get(this).expression }
        }
      , fragment: { enumerable: true,
            get: function(){ return views.get(this).fragment }
        }
      , Model: { enumerable: true, configurable: true,
            value: Model
        }
      , model: { enumerable: true,
            get: function(){ return views.get(this).model }
        }
      , node: { enumerable: true,
            get: function(){
                if ( !views.get(this).nodeproxy )
                  views.get(this).nodeproxy = new Proxy(this, nodeproxy)
            }
        }
      , nodes: { enumerable: true,
            get: function(){
                if ( !views.get(this).nodesproxy )
                  views.get(this).nodesproxy = new Proxy(this, nodesproxy)
            }
        }
      , parser: { enumerable: true, configurable: true,
            value: def_parser
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
      , recover: { enumerable: true,
            value: function(){
                this.nodes.root.forEach(node => this.fragment.appendChild(node))
            }
        }
      , refs: { enumerable: true,
            get: function(){ return views.get(this).refs }
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
            value: null
        }
      , toString: { enumerable: true,
            value: function(){
                const childNodes = Array.prototype.slice.call(this.fragment.childNodes)
                return [...childNodes].map(node => node.outerHTML).join("")
            }
        }
      , uid: { enumerable: true,
            get: function(){
                if ( !views.get(this).uid )
                  views.get(this).uid = UID.uid()

                return views.get(this).uid
            }
        }
    }
})
