"use strict"

const argv = new Set( process.argv.slice(2) )
module.exports.VERBOSE = argv.has("--VERBOSE") || argv.has("--verbose") || argv.has("-v")
module.exports.DEBUG = argv.has("--DEBUG") || argv.has("--debug") || argv.has("-d")
