"use strict"

const fs = require("fs")
const klass = require("../../../../lib/class").class
const path = require("path")

const View = require("../../../../lib/View").View

const Document = klass(View, {
    constructor: function(){
        View.call(this)
    }
  , template: "html>head(meta[charset=utf-8]+title{enron sample}+script[src=/js/enron.js])+body"
})

module.exports.path = [
    "/GET/datasets/:set.:format"
  , "/GET/enron"
]
module.exports.handleRoute = (route, next) => {
    const onerror = e => route.response.end(e.message)

    if ( route.matches.format == "json" ) {
        const filepath = path.join(path.resolve(process.cwd(), __dirname), `../datasets/${route.matches.set}.${route.matches.format}`)
        fs.stat(filepath, function(err, stats){
            route.response.writeHead(200, {
                  "Content-Type": "application/json; charset=UTF-8"
                , "Content-Length": stats.size
                , "Date": new Date(stats.mtime).toUTCString()
                , "Last-Modified": new Date(stats.mtime).toUTCString()
            })
            fs.createReadStream(filepath).pipe(route.response)
        })
    } else {
        const document = new Document
        const buffer = new Buffer(`<!doctype html>${document.toString()}`)
        const headers = {
            "Content-Type": "text/html; charset=UTF-8"
          , "Content-Length": buffer.length
        }

        route.response.writeHead(200, headers)
        route.response.end(buffer)
    }
}
