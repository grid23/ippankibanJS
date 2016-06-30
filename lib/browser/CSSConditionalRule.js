"use strict"

const errors = require("../errors")
const klass = require("../class").class
const typeOf = require("../type").type

const Event = require("../Event").Event
const LibNode = require("../Node").Node
const Serializer = require("../Serializer").Serializer
const UID = require("../UID").UID

module.exports._conditionalWM = new WeakMap
module.exports.CSSConditionalRule = klass(LibNode, statics => {
    const conditionals = module.exports._conditionalWM
    const rconditional = /^\@(document|supports|media)([^\{]*)\{(.*)\}/i

    return {
        constructor: function(condition = ""){
            LibNode.call(this)

            const atrule = rconditional.exec(condition)
            const type = atrule[1]
            const conditionText = atrule[2]
            const cssText = atrule[3]

            if ( !type || !conditionText )
              throw new TypeError(errors.TODO)

            if ( cssText && cssText.trim().length )
              console.warn(errors.WARN_IGNORED_AT_RULES_TEXT)

            conditionals.set(this, Object.create(null))
            conditionals.get(this).type = type
            conditionals.get(this).conditionText = conditionText
        }
      , cssText: { enumerable: true,
            get: function(){
                return `@${this.type}${this.conditionText}{}`
            }
        }
      , deleteRule: { enumerable: true,
            value: function(cssrule){
                let idx = -1
                let hit = false

                while ( idx = containers.get(this).cssRules.indexOf(cssRule), idx > -1 )
                  hit = true,
                  containers.get(this).cssRules.splice(idx, 1)

                return hit
            }
        }
      , condition: { enumerable: true, get: function(){ return conditionals.get(this).type } }
      , conditionText: { enumerable: true,
            get: function(){ return conditionals.get(this).conditionText }
        }
      , insertRule: { enumerable: true,
            value: function(){}
        }

    }
})
