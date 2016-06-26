"use strict"

module.exports.path = "*"
module.exports.handleRoute = (route, next) => {
    console.log(`sample: ${route.request.url}`)
}
