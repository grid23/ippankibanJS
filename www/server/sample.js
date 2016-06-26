"use strict"

const fs = require("fs")
const http = require("http")
const path = require("path")
const url = require("url")

const Router = require("../../lib/Router").Router

const PATH_ROOT = path.resolve(process.cwd(), __dirname)
const PATH_ROUTE = path.join(PATH_ROOT, "./sample/routes")
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
    const router = new Router
    const server = new http.Server

    routes.forEach(({path, handleRoute}) => router.addRouteHandler(path, handleRoute))

    server.on("request", (request, response) => {
        const pathname = `/${request.method.toUpperCase()}${url.parse(request.url).pathname}`
        const dispatch = router.dispatchRoute(pathname, {request, response})
        dispatch.addEventListener("error", e => {
            throw e.error
        })
        dispatch.addEventListener("routing", e => {
            if ( !e.count )
              response.statusCode = 404,
              response.end()
        })
    })

    server.listen(1338)
    console.log(`\nsample server listening on port 1338`)
})
.catch(err => console.log(err))
