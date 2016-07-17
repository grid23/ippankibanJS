"use strict"

const crypto = require("crypto")
const errors = require("./errors")
const klass = require("../lib/class").class
//const path = require("path")
//const typeOf = require("../lib/type").typeOf

const Event = require("../lib/Event").Event
const Route = require("../lib/Route").Route
const Router = require("../lib/Router").Router
const Server = require("./Server").Server

module.exports.WebSocketUpgrade = klass(Router, statics => {
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
                        }, 25000)
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

                        if ( length <= 125 ) {
                            message = new Buffer(2 + length)
                            start = 2
                            message[0] = 129
                            message[1] = 0 | length
                        }
                        else if ( length == 126 ) {
                            message = new Buffer(6 + length)
                            start = 6
                            message[0] = 129
                            message[1] = 126
                            message[2] = 0
                            message[3] = 126
                        } else {
                            message = new Buffer(10 + length)
                            start = 10
                            message[0] = 129
                            message[1] = 127

                            // LOL
                            const bin = Array.prototype.slice.call(length.toString(2)).reverse()
                            for ( let i = 9; i >= 2; i-- ) {
                                const byte = parseInt( Array.prototype.slice.call(bin.splice(0, Math.min(4, bin.length))).reverse().join(""), 2 )

                                message[i] = 0 | byte
                            }
                        }

                        for ( let i = 0; i<length; i++ )
                          message[i+start] = payload[i]

                        console.log("send", new Buffer(message.slice(start)).toString())
                        socket.write(message)
                    }

                    socket.on("data", buffer => {
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
                        const ispong = !!( type & 0xA ) // opcode pong
                        const isping = !!( type & 0x9 ) // opcode ping
                        if ( ispong ) {
                            console.log("<= pong")
                            return ping()
                        }

                        if ( isping ) {
                            console.log("<= ping")
                            return pong()
                        }

                        let start = 0
                        const length = (buffer[1] & 127) === 126 ? (start = 8, buffer.slice(2,3))
                                     : (buffer[1] & 127) === 127 ? (start = 14, buffer.slice(2, 8))
                                     : (start = 6, buffer[1])
                        const mask = buffer.slice(start-4, start)
                        const content = buffer.slice(start)

                        //decodedByte = encodedByte XOR masks[encodedByteIndex MOD 4]
                        for ( let [i, v] of content.entries() ) {
                            content[i] = v ^ mask[i%4]
                        }

                        console.log(content.toString("utf8"))
                    })

                    const onend = () => {
                        console.log("socket end")
                        sockets.delete(socket)
                    }

                    socket.on("end", onend)
                    socket.on("close", onend)
                    socket.on("timeout", onend)

                    ping()

                    // test <126, 126, > 126

                    setTimeout(()=>{
                        //msg_utf8("hello world")
                        msg_utf8("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin tortor eros, lacinia nec tortor ut, euismod maximus tortor. Fus")
                        //msg_utf8("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin tortor eros, lacinia nec tortor ut, euismod maximus tortor. Fusce vulputate purus lacus, at viverra tellus mollis vel. Pellentesque mollis tortor id placerat iaculis. Ut quam augue, imperdiet non tincidunt nec, maximus vel mi. Aliquam nulla felis, posuere dapibus tempus nec, bibendum in ligula. Etiam lorem mi, vulputate eget magna et, tempus egestas ipsum. Maecenas sit amet diam porta, feugiat nisl vel, efficitur lorem. Morbi eu eros at dui dictum commodo et sit amet ante. Maecenas et mollis libero, rutrum porttitor nunc. Nunc suscipit efficitur purus")
                    }, 5000)


                })

            }

            if ( server.listening )
              onlisten()
            else
              server.addListener("listening", onlisten)
        }
    }
})
