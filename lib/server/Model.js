"use strict"

const klass = require("../class").class

const Event = require("../Event").Event
const Node = require("../Node").Node

module.exports.Model = klass(Node, statics => {

    return {
        constructor: function(){
            Node.call(this)
        }
    }
})
