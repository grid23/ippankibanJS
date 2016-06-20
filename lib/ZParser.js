"use strict"

//TODO find a less crude way to discriminate server/browser without embarking the server code to a client build

try {
    window
    module.exports = require("./browser/ZParser")
} catch (e){
    module.exports = module.require("./server/ZParser")
}
