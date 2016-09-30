"use strict"

//TODO find a less crude way to discriminate server/browser without embarking the server code to a client build

try {
    window
    module.exports = window.WebSocket
} catch (e){
    module.exports = module.require("./server/WebSocket")
}
