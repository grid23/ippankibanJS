"use strict"

const fs = require("fs")
const http = require("http")
const path = require("path")
const url = require("url")

const PATH_ROOT = path.resolve(process.cwd(), __dirname)
const PATH_ROUTE = path.join(PATH_ROOT, "./specs/routes")
const IGNORE = [".DS_STORE"]

new Promise((resolve, reject) => {
    fs.readdir(PATH_ROUTE, (err, files) => {
        if ( err )
          return reject(err)

        resolve(files.filter(file => {
            let stat = fs.statSync(path.join(PATH_ROUTE, file))

            return IGNORE.indexOf(file) == -1 && stat.isFile()
        }))
    })
})
.then(files => {
    return Promise.all(
        files.map(file => {
            return new Promise((resolve, reject) => {
                resolve(require(path.join(PATH_ROUTE, file)))
            })
        })
    )
})
.then(routes => {
    const server = new http.Server

    server.on("request", (request, response) => {
        const pathname = url.parse(request.url).pathname
        const hit = routes.filter(({path}) => !!new RegExp(path).exec(pathname))[0]

        console.log(`=> "${pathname}" (${hit?"ok":"nok"})`)
        if ( hit )
          hit.handler(request, response)
        else
          response.statusCode = 404,
          response.end()
    })

    server.listen(1337)
    console.log(`\nspecs server listening on port 1337`)
})
.catch(err => console.log(err))
