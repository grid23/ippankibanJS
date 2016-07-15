"use strict"

const errors = require("./errors")
const fs = require("fs")
const klass = require("../lib/class").class
const net = require("net")
const path = require("path")
const typeOf = require("../lib/type").typeOf

const Event = require("../lib/Event").Event
const Route = require("../lib/Route").Route
const Router = require("../lib/Router").Router

module.exports.NetServer = klass(Router, statics => {
    const servers = new WeakMap

    return {
        constructor: function(port){

        }
    }
})
