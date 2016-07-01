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
            if ( !rconditional.exec(condition) )
              throw new TypeError(errors.TODO)

            CSSConditionalRule.call(this, condition)
        }
    }
})
