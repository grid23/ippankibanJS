"use strict"

const crypto = require("crypto")
const errors = require("./errors")
const eventWM = require("../lib/Event")._eventWM
const klass = require("../lib/class").class
const Socket = require("net").Socket

//const path = require("path")
//const typeOf = require("../lib/type").typeOf

const Event = require("../lib/Event").Event
const Node = require("../lib/Node").Node

const Route = require("../lib/Route").Route
const Router = require("../lib/Router").Router
const Server = require("./Server").Server
const UID = require("../lib/UID").UID

module.exports.SocketEvt = klass(Event, statics => {
    const events = eventWM

    Object.defineProperties(statics, {
        "NAME": { enumerable: true,
            value: "socket"
        }
    })

    return {
        constructor: function(socket){
            if ( !module.exports.WebSocket.isImplementedBy(socket) )
              throw new TypeError(errors.TODO)

            Event.call(this, module.exports.SocketEvt.NAME)
            events.get(this).socket = socket
        }
      , socket: {  enumerable: true,
            get: function(){ return events.get(this).socket }
        }
    }
})

module.exports.SocketMessageEvt = klass(Event, statics => {
    const events = eventWM

    Object.defineProperties(statics, {
        "NAME": { enumerable: true,
            value: "message"
        }
    })

    return {
        constructor: function(payload){
            Event.call(this, module.exports.SocketMessageEvt.NAME)
            events.get(this).payload = payload
        }
      , payload: {  enumerable: true,
            get: function(){ return events.get(this).payload }
        }
    }
})

module.exports.WebSocket = klass(Node, statics => {
    /*
    0               1               2               3
    0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0
    +-+-+-+-+-------+-+-------------+-------------------------------+
    |F|R|R|R| opcode|M| Payload len |    Extended payload length    |
    |I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
    |N|V|V|V|       |S|             |   (if payload len==126/127)   |
    | |1|2|3|       |K|             |                               |
    +-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
    |     Extended payload length continued, if payload len == 127  |
    + - - - - - - - - - - - - - - - +-------------------------------+
    |                               |Masking-key, if MASK set to 1  |
    +-------------------------------+-------------------------------+
    | Masking-key (continued)       |          Payload Data         |
    +-------------------------------- - - - - - - - - - - - - - - - +
    :                     Payload Data continued ...                :
    + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
    |                     Payload Data continued ...                |
    +---------------------------------------------------------------+
    */
    //TODO: use better code for buffer manips :D...

    const sockets = new WeakMap

    return {
        constructor: function(socket){
            if ( !(socket instanceof Socket) )
              throw new TypeError(errors.TODO)

            Node.call(this)
            sockets.set(this, Object.create(null))
            sockets.get(this).uid = UID.uid()
            sockets.get(this).socket = socket

            const ondata = buffer => { //TODO rewrite
                const type = buffer[0]
                const ismasked = buffer[1] & 128
                const ispong = (type - 128) == 10
                const isping = (type - 128) == 9

                if ( ispong )
                    return this.dispatchEvent("pong")
                if ( isping )
                    return this.pong()

                let start = 0
                const length = (buffer[1] & 127) === 126 ? (start = 8, buffer.slice(2,3))
                             : (buffer[1] & 127) === 127 ? (start = 14, buffer.slice(2, 8))
                             : (start = 6, buffer[1])
                const mask = ismasked && buffer.slice(start-4, start)
                const payload = ismasked ? buffer.slice(start) : buffer.slice(start-4)

                //decodedByte = encodedByte XOR masks[encodedByteIndex MOD 4]
                if ( ismasked )
                  for ( let [i, v] of payload.entries() )
                    payload[i] = v ^ mask[i%4]

                this.dispatchEvent( new module.exports.SocketMessageEvt(payload.toString("utf8")) )
            }
            sockets.get(this).socket.on("data", ondata)

            const onend = () => {
                this.dispatchEvent("close")
            }

            sockets.get(this).socket.on("end", onend)
            sockets.get(this).socket.on("close", onend)
            sockets.get(this).socket.on("timeout", onend)

            const pingpong = () => this.ping().then(() => setTimeout(pingpong, 25000))
            setTimeout(pingpong, 1000)
        }
      , close: { enumerable: true,
            value: function(){
                sockets.get(this).close()
            }
        }
      , message: { enumerable: true,
            value: function(){ // TODO
                return this.frame_text.apply(this, arguments)
            }
        }
      , frame_binary: { enumerable: true,
            value: function(){  // TODO
            }
        }
      , frame_text: { enumerable: true,
            value: function(msg){
                return new Promise((resolve, reject) => {
                    let message
                    let start
                    const payload = new Buffer(msg)
                    const length = payload.length
                    const opcode = 1

                    if ( length <= 125 ) {
                        message = new Buffer(2)
                        start = 2
                        message[0] = 128 + opcode
                        message[1] = length
                    }
                    else if ( (length > 125) && (length <= 32767) ) {
                        message = new Buffer(4)
                        start = 4
                        message[0] = 128 + opcode
                        message[1] = 126

                        const bin = Array.prototype.slice.call(length.toString(2))
                        let idx = message.length-1
                        const from = message.length-2

                        for (; idx >= from; idx --) {
                            const byte = bin.splice(Math.min(-8, bin.length), Math.min(8, bin.length)).join("") || "0"
                            message[idx] = parseInt(byte, 2)
                        }
                    } else {
                        message = new Buffer(10)
                        start = 10
                        message[0] = 128 + opcode
                        message[1] = 127

                        const bin = Array.prototype.slice.call(length.toString(2))
                        let idx = message.length-1
                        const from = message.length-8

                        for (; idx >= from; idx-- ) {
                            const byte = bin.splice(Math.min(-8, bin.length), Math.min(8, bin.length)).join("") || "0"
                            message[idx] = parseInt(byte, 2)
                        }
                    }

                    const _message = Buffer.concat([message, payload], length+start)
                    sockets.get(this).socket.write(_message, err => {
                        resolve()
                    })
                })
            }
        }
      , ping: { enumerable: true,
            value: function(){
                //TODO, add a reject cause ( ie, no pong )
                //TODO, no need to recreate the msg everytime
                return new Promise((resolve, reject) => {
                    const message = new Buffer(2)
                    message[0] = 137 // "10001001"
                    message[1] = 0   // "00000000"

                    const onpong = e => {
                        this.removeEventListener("pong", onpong, true)
                        resolve()
                    }

                    this.addEventListener("pong", onpong, true)
                    this.dispatchEvent("ping")
                    sockets.get(this).socket.write(message)
                })
            }
        }
      , pong: { enumerable: false,
            value: function(){
                //TODO shouldn't be called from the outside, move
                //TODO, no need to recreate the msg everytime

                const message = new Buffer(2)
                message[0] = 138 // "10001010"
                message[1] = 0   // "00000000"
                sockets.get(this).socket.write(message)
            }
        }
      , uid: { enumerable: true,
            get: function(){ return sockets.get(this).uid }
        }
    }
})

module.exports.WebSocketUpgrade = klass(Node, statics => {
    const upgrades = new WeakMap()
    const magic_uuid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

    return {
        constructor: function(server){
            Node.call(this)
            upgrades.set(this, Object.create(null))
            upgrades.get(this).sockets = new Set

            if ( !Server.isImplementedBy(server) )
              throw new TypeError(errors.TODO)
            upgrades.get(this).server = server

            const onlisten = e => {
                if ( !!e )
                  server.removeListener("listening", onlisten)

                upgrades.get(this).server.on("upgrade", ({headers}, socket, head) => {
                    const shasum = crypto.createHash("sha1")
                    shasum.update(headers["sec-websocket-key"] + magic_uuid, 'binary')
                    const hash = shasum.digest("base64")

                    const response = [
                        `HTTP/1.1 101 Switching Protocols`
                      , `Upgrade: websocket`
                      , `Connection: ${headers["connection"]}`
                      , `Sec-WebSocket-Accept: ${hash}`
                      , `Sec-WebSocket-Protocol: ${headers["sec-websocket-protocol"].split(",")[0]}` //TODO
                      , ``, ``
                    ].join('\r\n')


                    if ( headers["connection"].indexOf("keep-alive") != -1 )
                        socket.setKeepAlive(true, 0)
                    socket.write(response)

                    const _socket = new module.exports.WebSocket(socket)
                    upgrades.get(this).sockets.add(_socket)
                    _socket.addEventListener("end", e => {
                        upgrades.get(this).sockets.delete(_socket)
                    }, true)

                    this.dispatchEvent(new module.exports.SocketEvt(_socket))
                })
            }

            if ( server.listening ) onlisten()
            else server.addListener("listening", onlisten)
        }
      , sockets: { enumerable: true,
            get: function(){
                return [...upgrades.get(this).socket]
            }
        }
    }
})

module.exports.WebSocketUpgrade2 = klass(Router, statics => {
    const upgrades = new WeakMap
    const magic_uuid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
    const sockets = new Map

    return {
        constructor: function(server, schemes){
            upgrades.set(this, Object.create(null))

            if ( !Server.isImplementedBy(server) )
              throw new TypeError(errors.TODO)
            upgrades.get(this).server = server

            const onlisten = e => {
                if ( !!e )
                  server.removeListener("listening", onlisten)

                upgrades.get(this).server.on("upgrade", ({headers}, socket, head) => {
                    const shasum = crypto.createHash("sha1")
                    shasum.update(headers["sec-websocket-key"] + magic_uuid, 'binary')
                    const hash = shasum.digest("base64")

                    const response = [
                        `HTTP/1.1 101 Switching Protocols`
                      , `Upgrade: websocket`
                      , `Connection: ${headers["connection"]}`
                      , `Sec-WebSocket-Accept: ${hash}`
                      , `Sec-WebSocket-Protocol: ${headers["sec-websocket-protocol"].split(",")[0]}` //TODO
                      , ``, ``
                    ].join('\r\n')


                    if ( headers["connection"].indexOf("keep-alive") != -1 )
                        socket.setKeepAlive(true, 0)
                    socket.write(response)
                    sockets.set(socket, Object.create(null))

                    const ping = () => {
                        /*
                         0               1               2               3
                         0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0
                         +-+-+-+-+-------+-+-------------+-------------------------------+
                         |F|R|R|R| opcode|M| Payload len |    Extended payload length    |
                         |I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
                         |N|V|V|V|       |S|             |   (if payload len==126/127)   |
                         | |1|2|3|       |K|             |                               |
                         +-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
                         |     Extended payload length continued, if payload len == 127  |
                         + - - - - - - - - - - - - - - - +-------------------------------+
                         |                               |Masking-key, if MASK set to 1  |
                         +-------------------------------+-------------------------------+
                         | Masking-key (continued)       |          Payload Data         |
                         +-------------------------------- - - - - - - - - - - - - - - - +
                         :                     Payload Data continued ...                :
                         + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
                         |                     Payload Data continued ...                |
                         +---------------------------------------------------------------+
                         */
                        const message = new Buffer(2)
                        message[0] = 137 // "10001001"
                        message[1] = 0   // "00000000"
                        setTimeout(()=> {
                          console.log("=> ping")
                          socket.write(message)
                        }, 5000)
                    }

                    const pong = () => {
                        /*
                         0               1               2               3
                         0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0
                         +-+-+-+-+-------+-+-------------+-------------------------------+
                         |F|R|R|R| opcode|M| Payload len |    Extended payload length    |
                         |I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
                         |N|V|V|V|       |S|             |   (if payload len==126/127)   |
                         | |1|2|3|       |K|             |                               |
                         +-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
                         |     Extended payload length continued, if payload len == 127  |
                         + - - - - - - - - - - - - - - - +-------------------------------+
                         |                               |Masking-key, if MASK set to 1  |
                         +-------------------------------+-------------------------------+
                         | Masking-key (continued)       |          Payload Data         |
                         +-------------------------------- - - - - - - - - - - - - - - - +
                         :                     Payload Data continued ...                :
                         + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
                         |                     Payload Data continued ...                |
                         +---------------------------------------------------------------+
                         */
                        const message = new Buffer(2)
                        message[0] = 138 // "10001010"
                        message[1] = 0   // "00000000"

                        console.log("=> pong")
                        socket.write(message)
                    }

                    const msg_utf8 = (msg, mask=false) => {
                        /*
                         0               1               2               3
                         0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7
                        +-+-+-+-+-------+-+-------------+-------------------------------+
                        |F|R|R|R| opcode|M| Payload len |    Extended payload length    |
                        |I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
                        |N|V|V|V|       |S|             |   (if payload len==126/127)   |
                        | |1|2|3|       |K|             |                               |
                        +-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
                         4               5               6               7
                        + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
                        |     Extended payload length continued, if payload len == 127  |
                        + - - - - - - - - - - - - - - - +-------------------------------+
                         8               9               10              11
                        + - - - - - - - - - - - - - - - +-------------------------------+
                        |                               |Masking-key, if MASK set to 1  |
                        +-------------------------------+-------------------------------+
                         12              13              14              15
                        +-------------------------------+-------------------------------+
                        | Masking-key (continued)       |          Payload Data         |
                        +-------------------------------- - - - - - - - - - - - - - - - +
                        :                     Payload Data continued ...                :
                        + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
                        |                     Payload Data continued ...                |
                        +---------------------------------------------------------------+
                        */

                        let message
                        let start
                        const payload = new Buffer(msg)
                        const length = payload.length
                        const opcode = 1
                        if ( length <= 125 ) {
                            message = new Buffer(2)
                            start = 2
                            message[0] = 128 + opcode
                            message[1] = length
                        }
                        else if ( (length > 125) && (length <= 32767) ) {
                            message = new Buffer(4)
                            start = 4
                            message[0] = 128 + opcode
                            message[1] = 126

                            const bin = Array.prototype.slice.call(length.toString(2))
                            let idx = message.length-1
                            const from = message.length-2

                            for (; idx >= from; idx --) {
                                const byte = bin.splice(Math.min(-8, bin.length), Math.min(8, bin.length)).join("") || "0"
                                message[idx] = parseInt(byte, 2)
                            }
                        } else {
                            message = new Buffer(10)
                            start = 10
                            message[0] = 128 + opcode
                            message[1] = 127

                            const bin = Array.prototype.slice.call(length.toString(2))
                            let idx = message.length-1
                            const from = message.length-8

                            for (; idx >= from; idx-- ) {
                                const byte = bin.splice(Math.min(-8, bin.length), Math.min(8, bin.length)).join("") || "0"
                                message[idx] = parseInt(byte, 2)
                            }

                        }

                        const _message = Buffer.concat([message, payload], length+start)

                        socket.write(_message, err => {
                            console.log("=>", _message.toString("utf-8"))
                        })

                    }

                    const ondata = (buffer, debug) => {
                        /*
                         0               1               2               3
                         0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7
                        +-+-+-+-+-------+-+-------------+-------------------------------+
                        |F|R|R|R| opcode|M| Payload len |    Extended payload length    |
                        |I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
                        |N|V|V|V|       |S|             |   (if payload len==126/127)   |
                        | |1|2|3|       |K|             |                               |
                        +-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
                         4               5               6               7
                        + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
                        |     Extended payload length continued, if payload len == 127  |
                        + - - - - - - - - - - - - - - - +-------------------------------+
                         8               9               10              11
                        + - - - - - - - - - - - - - - - +-------------------------------+
                        |                               |Masking-key, if MASK set to 1  |
                        +-------------------------------+-------------------------------+
                         12              13              14              15
                        +-------------------------------+-------------------------------+
                        | Masking-key (continued)       |          Payload Data         |
                        +-------------------------------- - - - - - - - - - - - - - - - +
                        :                     Payload Data continued ...                :
                        + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
                        |                     Payload Data continued ...                |
                        +---------------------------------------------------------------+
                        */

                        // t = type, l = length, m = mask, x = content
                        // [0,1,2,3,4,5,6,7,8,9;0,1,2,3,4,5,6,...]
                        // [t,l,m,m,m,m,x,x,x,x,x,x,x,x,x,x,x,...]
                        // [t,l,l,l,m,m,m,m,x,x,x,x,x,x,x,x,x,...]
                        // [t,l,l,l,l,l,l,l,l,l,m,m,m,m,x,x,x,...]

                        const type = buffer[0]
                        const ismasked = buffer[1] & 128
                        const ispong = (type - 128) == 10
                        const isping = (type - 128) == 9

                        if ( ispong && !debug) {
                            console.log("<= pong")
                            return ping()
                        }

                        if ( isping && !debug ) {
                            console.log("<= ping")
                            return pong()
                        }

                        let start = 0
                        const length = (buffer[1] & 127) === 126 ? (start = 8, buffer.slice(2,3))
                                     : (buffer[1] & 127) === 127 ? (start = 14, buffer.slice(2, 8))
                                     : (start = 6, buffer[1])
                        const mask = ismasked && buffer.slice(start-4, start)
                        const content = ismasked ? buffer.slice(start) : buffer.slice(start-4)

                        //decodedByte = encodedByte XOR masks[encodedByteIndex MOD 4]
                        if ( ismasked )
                          for ( let [i, v] of content.entries() ) {
                              content[i] = v ^ mask[i%4]
                          }

                        console.log("<=", content.toString("utf8"))
                    }
                    socket.on("data", ondata)

                    const onend = () => {
                        console.log("socket end")
                        sockets.delete(socket)
                    }

                    socket.on("end", onend)
                    socket.on("close", onend)
                    socket.on("timeout", onend)

                    ping()

                    setTimeout(()=>{
                        msg_utf8("hello world")
                        msg_utf8("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin tortor eros, lacinia nec tortor ut, euismod maximus tortor. Fus")
                        msg_utf8("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin tortor eros, lacinia nec tortor ut, euismod maximus tortor. Fus")
                        msg_utf8("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin tortor eros, lacinia nec tortor ut, euismod maximus tortor. Fus")
                        msg_utf8("hello world")
                        msg_utf8("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin tortor eros, lacinia nec tortor ut, euismod maximus tortor. Fusce vulputate.")
                    }, 2500)


                })

            }

            if ( server.listening )
              onlisten()
            else
              server.addListener("listening", onlisten)
        }
    }
})
