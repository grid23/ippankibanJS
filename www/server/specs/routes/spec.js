"use strict"

const fs = require("fs")
const path = require("path")
const url = require("url")

const PATH_ROOT = path.resolve(process.cwd(), __dirname)
const PATH_FILES = path.join(PATH_ROOT, "../../../../specs/browser")

module.exports.path = "^/specs/(.*)$"
module.exports.handler = (request, response) => {
    let file = path.join(PATH_FILES, url.parse(request.url).pathname.replace("/specs", ""))

    response.statusCode = 200
    response.setHeader("Content-Type", "application/JavaScript")
    fs.createReadStream(file).pipe(response)
}
