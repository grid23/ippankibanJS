"use strict"

const conditionalWM = require("../CSSConditionalRule")._conditionalWM
const errors = require("../errors")
const klass = require("../class").class
const typeOf = require("../type").type

const CSSConditionalRule = require("../CSSConditionalRule").CSSConditionalRule
const Event = require("../Event").Event
const Serializer = require("../Serializer").Serializer
const UID = require("../UID").UID


module.exports.CSSMediaRule = klass(CSSConditionalRule, statics => {
    const conditionals = conditionalWM
    var rconditional = /^\@media([^\{]*)\{(.*)\}/i

    return {
        constructor: function(condition = ""){
            const atrule = rconditional.exec(condition)
            const conditionText = atrule[1]
            const cssText = atrule[2]

            if ( !conditionText )
              throw new TypeError(errors.TODO)

            if ( cssText && cssText.trim().length )
              console.warn(errors.WARN_IGNORED_AT_RULES_TEXT)

            conditionals.set(this, Object.create(null))
            conditionals.get(this).type = "media"
            conditionals.get(this).conditionText = conditionText
        }
    }
})
