"use strict"

//TODO find a less crude way to discriminate server/browser without embarking the server code to a client build

try {
    window
    module.exports = require("./browser/Stylesheet")
} catch (e){
    console.log(e)
    module.exports = module.require("./server/Stylesheet")
}
