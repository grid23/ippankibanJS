"use strict"

const fs = require("fs")
const path = require("path")

const PATH_ROOT = path.resolve(process.cwd(), __dirname)
const PATH_FILE = path.join(PATH_ROOT, "../../../node_modules/chai/chai.js")

module.exports.path = "^/js/chai$"
module.exports.handler = (request, response) => {
    response.statusCode = 200
    response.setHeader("Content-Type", "application/JavaScript")
    fs.createReadStream(PATH_FILE).pipe(response)
}
