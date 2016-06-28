"use strict"

const klass = require("../../../../lib/class").class

const View = require("../../../../lib/View").View

const Document = klass(View, {
    constructor: function(){
        View.call(this)
    }
  , template: "html>head+body{coucou}"
})

module.exports.path = "/GET/"
module.exports.handleRoute = (route, next) => {
    const onerror = e => route.response.end(e.message)

    const document = new Document
    const buffer = new Buffer(`<!doctype html>${document.toString()}`)
    const headers = {
        "Content-Type": "text/html; charset=UTF-8"
      , "Content-Length": buffer.length
    }

    route.response.writeHead(200, headers)
    route.response.end(buffer)
}
