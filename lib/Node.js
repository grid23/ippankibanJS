"use strict"

const errors = require("./errors")
const klass = require("./class").class

const EventTarget = require("./EventTarget").EventTarget

module.exports.Node = klass(EventTarget, statics => {
    const nodes = new WeakMap

    return {
        constructor: function(){
            nodes.set(this, new Map)
            nodes.get(this).set("children", [])
        }
      , appendChild: { enumerable: true,
            value: function(node){
                if ( !(node instanceof module.exports.Node) || node === this )
                  throw new Error(errors.INVALID_CHILD_OBJ) //TODO

                if ( !!node.parentNode )
                  node.parentNode.removeChild(node)

                nodes.get(this).get("children").push(node)
                nodes.get(node).set("parentNode", this)

                return node
            }
        }
      , childNodes: { enumerable: true,
            get: function(){
                return [...nodes.get(this).get("children")]
            }
        }
      , children: { enumerable: true,
            get: function(){
                return this.childNodes
            }
        }
      , firstChild: { enumerable: true,
            get: function(){ return nodes.get(this).get("children")[0] || null }
        }
      , hasChildNodes: { enumerable: true,
            value: function(){
                return !!nodes.get(this).get("children").length
            }
        }
      , insertBefore: { enumerable: true,
            value: function(node, nextSibling){
                if ( !module.exports.Node.isImplementedBy(node) )
                  throw new TypeError() //TODO

                if ( !!node.parentNode )
                  node.parentNode.removeChild(node)

                let idx = nodes.get(this).get("children").indexOf(nextSibling)
                idx = idx != -1 ? idx : nodes.get(this).get("children").length

                nodes.get(this).get("children").splice(idx, 0, node)
                nodes.get(node).set("parentNode", this)

                return node
            }
        }
      , isEqualNode: { enumerable: true,
            value: function(node){
                return this.constructor.isImplementedBy(node)
            }
        }
      , isSameNode: { enumerable: true,
            value: function(node){
                return this === node
            }
        }
      , lastChild: { enumerable: true,
            get: function(){ return nodes.get(this).get("children")[nodes.get(this).get("children").length-1] || null }
        }
      , nextSibling: { enumerable: true,
            get: function(){
                if ( !this.parentNode )
                  return null

                let idx = nodes.get(this.parentNode).get("children").indexOf(this) + 1

                return nodes.get(this.parentNode).get("children")[idx] || null
            }
        }
      , parentNode: { enumerable: true,
            get: function(){ return nodes.get(this).get("parentNode") }
        }
      , previousSibling: { enumerable: true,
            get: function(){
                if ( !this.parentNode )
                  return null

                let idx = nodes.get(this.parentNode).get("children").indexOf(this) - 1

                return nodes.get(this.parentNode).get("children")[idx] || null
            }
        }
      , removeChild: { enumerable: true,
            value: function(node){
                let idx

                if ( idx = nodes.get(this).get("children").indexOf(node), idx == -1 )
                  return

                nodes.get(this).get("children").splice(idx, 1)
                nodes.get(node).delete("parentNode")
            }
        }
      , replaceChild: { enumerable: true,
            value: function(node, replace){
                if ( !!module.exports.Node.isImplementedBy(node) )
                  throw new TypeError() //TODO

                let idx = nodes.get(this).get("children").indexOf(replace)

                if ( idx === -1)
                  throw new Error() //todo

                nodes.get(this).get("children")[idx] = node

            }
        }
      , rootNode: { enumerable: true,
            get: function(){
                let node

                while ( !!node.parentNode )
                  node = node.parentNode

                return node || null
            }
        }
      , siblings: { enumerable: true,
            get: function(){
                if ( !this.parentNode )
                  return null

                let siblings = nodes.get(this.parentNode).get("children").slice(0)
                let idx = siblings.indexOf(this)
                siblings.splice(idx, 1)

                return siblings
            }
        }
    }
})
