"use strict"

const browserify = require("browserify")
const fs = require("fs")
const path = require("path")

const PATH_ROOT = path.resolve(process.cwd(), __dirname)
const PATH_INDEX = path.join(PATH_ROOT, "../../../index.js")

module.exports.path = "^/js/lib$"
module.exports.handler = (request, response) => {
    const bundle = browserify(PATH_INDEX, {
        debug: true
    })

    bundle.require(PATH_INDEX, { expose: "lib" })

    bundle.on("bundle", stream => {
        stream.pipe(response)
    })

    bundle.bundle()
}
