"use strict"

const errors = require("./errors")
const klass = require("./class").class

const EventTarget = require("./EventTarget").EventTarget

module.exports.Node = klass(EventTarget, statics => {
    const nodes = new WeakMap

    return {
        constructor: function(){
            nodes.set(this, Object.create(null))
            nodes.get(this).children = []
        }
      , appendChild: { enumerable: true,
            value: function(node){
                if ( !module.exports.Node.isImplementedBy(node) )
                  throw new TypeError() //TODO

                if ( !!node.parentNode )
                  node.parentNode.removeChild(node)

                nodes.get(this).children.push(node)
                nodes.get(node).parentNode = this

                return node
            }
        }
      , childNodes: { enumerable: true,
            get: function(){
                return [].concat(nodes.get(this).children)
            }
        }
      , children: { enumerable: true,
            get: function(){
                return this.childNodes
            }
        }
      , firstChild: { enumerable: true,
            get: function(){ return nodes.get(this).children[0] || null }
        }
      , hasChildNodes: { enumerable: true,
            value: function(){
                return !!nodes.get(this).children.length
            }
        }
      , insertBefore: { enumerable: true,
            value: function(node, nextSibling){
                if ( !module.exports.Node.isImplementedBy(node) )
                  throw new TypeError() //TODO

                if ( !!node.parentNode )
                  node.parentNode.removeChild(node)

                let idx = nodes.get(this).children.indexOf(nextSibling)
                idx = idx != -1 ? idx : nodes.get(this).children.length

                nodes.get(this).children.splice(idx, 0, node)
                nodes.get(node).parentNode = this

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
            get: function(){ return nodes.get(this).children[nodes.get(this).children.length-1] || null }
        }
      , nextSibling: { enumerable: true,
            get: function(){
                if ( !this.parentNode )
                  return null

                let idx = nodes.get(this.parentNode).children.indexOf(this) + 1

                return nodes.get(this.parentNode).children[idx] || null
            }
        }
      , parentNode: { enumerable: true,
            get: function(){ return nodes.get(this).parentNode }
        }
      , previousSibling: { enumerable: true,
            get: function(){
                if ( !this.parentNode )
                  return null

                let idx = nodes.get(this.parentNode).children.indexOf(this) - 1

                return nodes.get(this.parentNode).children[idx] || null
            }
        }
      , removeChild: { enumerable: true,
            value: function(node){
                let idx

                if ( idx = nodes.get(this).children.indexOf(node), idx == -1 )
                  return

                nodes.get(this).children.splice(idx, 1)
                delete nodes.get(node).parentNode
            }
        }
      , replaceChild: { enumerable: true,
            value: function(node, replace){
                if ( !!module.exports.Node.isImplementedBy(node) )
                  throw new TypeError() //TODO

                let idx = nodes.get(this).children.indexOf(replace)

                if ( idx === -1)
                  throw new Error() //todo

                nodes.get(this).children[idx] = node

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
    }
})
