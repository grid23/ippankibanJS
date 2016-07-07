"use strict"

const browserify = require("browserify")
const fs = require("fs")
const klass = require("../../../../lib/class").class
const path = require("path")

module.exports.path = [
    "/GET/:type(js|css)/:file"
]

module.exports.handleRoute = (route, next) => {
    const onerror = e => route.response.end(e.message)

    if ( route.matches.type === "css" ) {
      const filepath = path.join(path.resolve(process.cwd(), __dirname), "../client/css", route.matches.file)

      fs.stat(filepath, function(err, stats){
          route.response.writeHead(200, {
                "Content-Type": "text/css; charset=UTF-8"
              , "Content-Length": stats.size
              , "Date": new Date(stats.mtime).toUTCString()
              , "Last-Modified": new Date(stats.mtime).toUTCString()
          })
          fs.createReadStream(filepath).pipe(route.response)
      })
    } else {
        const filepath = path.join(path.resolve(process.cwd(), __dirname), "../client/js", route.matches.file)
        const bundle = browserify(filepath, {
            debug: true
        })

        bundle.on("bundle", stream => {
            stream.pipe(route.response)
        })

        bundle.bundle()
    }
}
