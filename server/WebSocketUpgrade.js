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
const Server = require("./Server").Server
const UID = require("../lib/UID").UID

const SocketEvt = klass(Event, statics => {
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

            Event.call(this, SocketEvt.NAME)
            events.get(this).socket = socket
        }
      , socket: {  enumerable: true,
            get: function(){ return events.get(this).socket }
        }
    }
})

const SocketMessageEvt = klass(Event, statics => {
    const events = eventWM

    Object.defineProperties(statics, {
        NAME: { enumerable: true,
            value: "message"
        }
    })

    const ops = {
        1: "text"
      , 2: "binary"
      , 8: "close"
      , 9: "ping"
      ,10: "pong"
    }

    return {
        constructor: function({ buffer, fin, rsv1, rsv2, rsv3, opcode, masked, length, start, mask }){
            Event.call(this, SocketMessageEvt.NAME)

            events.get(this).buffer = buffer
            events.get(this).fin = fin
            events.get(this).rsv1 = rsv1
            events.get(this).rsv2 = rsv2
            events.get(this).rsv3 = rsv3
            events.get(this).opcode = opcode
            events.get(this).op = ops[opcode]
            events.get(this).masked = masked
            events.get(this).mask = mask
            events.get(this).length = length
            events.get(this).start = start
        }
      , fin: { enumerable: true,
            get: function(){ return events.get(this).fin }
        }
      , length: { enumerable: true,
            get: function(){ return events.get(this).length }
        }
      , mask: { enumerable: true,
            get: function(){ return events.get(this).mask }
        }
      , op: { enumerable: true,
            get: function(){ return events.get(this).op }
        }
      , opcode: { enumerable: true,
            get: function(){ return events.get(this).opcode }
        }
      , payload: { enumerable: true,
            get: function(){
                return events.get(this).buffer.slice(events.get(this).start).toString("utf8")
            }
        }
      , unmask: { enumerable: true,
            value: function(){
                if ( !events.get(this).masked )
                  return this.payload

                const view = events.get(this).buffer.slice(events.get(this).start)
                for ( let [i, v] of view.entries() )
                  view[i] = v ^ events.get(this).mask[i%4]

                return view.toString("utf8")
            }
        }
    }
})

const SocketTextMessageEvt = klass(SocketMessageEvt, statics => {
    const events = eventWM

    Object.defineProperties(statics, {
        NAME: { enumerable: true,
            value: "text"
        }
    })

    return {
        constructor: function(e){
            Event.call(this, SocketTextMessageEvt.NAME)

            events.get(this).buffer = events.get(e).buffer
            events.get(this).fin = events.get(e).fin
            events.get(this).rsv1 = events.get(e).rsv1
            events.get(this).rsv2 = events.get(e).rsv2
            events.get(this).rsv3 = events.get(e).rsv3
            events.get(this).opcode = events.get(e).opcode
            events.get(this).op = events.get(e).op
            events.get(this).masked = events.get(e).masked
            events.get(this).mask = events.get(e).mask
            events.get(this).length = events.get(e).length
            events.get(this).start = events.get(e).start
        }
    }
})

const SocketBinaryMessageEvt = klass(SocketMessageEvt, statics => {
    const events = eventWM

    Object.defineProperties(statics, {
        NAME: { enumerable: true,
            value: "binary"
        }
    })

    return {
        constructor: function(e){
            Event.call(this, SocketBinaryMessageEvt.NAME)

            events.get(this).buffer = events.get(e).buffer
            events.get(this).fin = events.get(e).fin
            events.get(this).rsv1 = events.get(e).rsv1
            events.get(this).rsv2 = events.get(e).rsv2
            events.get(this).rsv3 = events.get(e).rsv3
            events.get(this).opcode = events.get(e).opcode
            events.get(this).op = events.get(e).op
            events.get(this).masked = events.get(e).masked
            events.get(this).mask = events.get(e).mask
            events.get(this).length = events.get(e).length
            events.get(this).start = events.get(e).start
        }
    }
})

const SocketPingEvt = klass(Event, statics => {
    const events = eventWM

    Object.defineProperties(statics, {
        NAME: { enumerable: true,
            value: "ping"
        }
    })

    return {
        constructor: function(e){
            Event.call(this, SocketPingEvt.NAME)
        }
    }
})

const SocketPongEvt = klass(Event, statics => {
    const events = eventWM

    Object.defineProperties(statics, {
        NAME: { enumerable: true,
            value: "pong"
        }
    })

    return {
        constructor: function(e){
            Event.call(this, SocketPongEvt.NAME)
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

    Object.defineProperties(statics, {
        PONG_TIMEOUT: { enumerable: true,
            value: 5000
        }
    })

    return {
        constructor: function(socket){
            if ( !(socket instanceof Socket) )
              throw new TypeError(errors.TODO)

            Node.call(this)
            sockets.set(this, Object.create(null))
            sockets.get(this).uid = UID.uid()
            sockets.get(this).socket = socket

            this.socket.on("data", buffer => {
                let view = buffer.readUInt8(0)
                const fin =  !!(view & 0x80)
                const rsv1 = view & 0x40
                const rsv2 = view & 0x20
                const rsv3 = view & 0x10
                const opcode = view & 0xf

                view = buffer.readUInt8(1)
                const masked = !!(view & 0x80)
                const {length, mask, start} = function(){
                    const len = (view & 0x7f)
                    const length = len < 126 ? len
                                 : len == 126 ? buffer.readUInt16BE(2)
                                 : (buffer.readUInt32BE(2) << 8) + buffer.readUInt32BE(6)
                    const mask = !masked ? 0
                               : len < 126 ? buffer.slice(2,6)
                               : len == 126 ? buffer.slice(4, 8)
                               : buffer.slice(10,14)
                    const start = len < 126 && masked ? 6
                                : len < 126 && !masked ? 2
                                : len == 126 && masked ? 8
                                : len == 126 && !masked ? 4
                                : masked ? 14
                                : 10
                    return { length, mask, start }
                }()

                const socketMessageEvt = new SocketMessageEvt({ buffer, fin, rsv1, rsv2, rsv3, opcode, masked, length, start, mask })

                this.dispatchEvent(socketMessageEvt)
                if ( socketMessageEvt.cancelled )
                  return

                switch ( socketMessageEvt.op ) {
                    case "text":
                      this.dispatchEvent(new SocketTextMessageEvt(socketMessageEvt))
                      break
                    case "binary":
                      this.dispatchEvent(new SocketBinaryMessageEvt(socketMessageEvt))
                      break
                    case "pong":
                      this.dispatchEvent(new SocketPongEvt())
                      break
                    case "ping":
                      this.pong()
                      break
                    default:
                      return
                }
            })

            let close = false
            const onend = () => {
                close = true
                this.dispatchEvent("close")
            }

            sockets.get(this).socket.on("end", onend)
            sockets.get(this).socket.on("close", onend)
            sockets.get(this).socket.on("timeout", onend)

            const pingpong = () => {
                if ( close )
                  return

                const op =  this.ping()
                op.catch(e => this.close())
                op.then(() => setTimeout(pingpong, 25000))
            }
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
                //TODO, no need to recreate the msg everytime ?
                return new Promise((resolve, reject) => {
                    const buffer = new Buffer(2)
                    buffer.writeUInt16BE(0x8900, 0)

                    const timeout = setTimeout(() => {
                        this.removeEventListener("pong", onpong, true)
                        //TODO ?
                        reject()
                    }, module.exports.WebSocket.PONG_TIMEOUT)

                    const onpong = e => {
                        clearTimeout(timeout)
                        this.removeEventListener("pong", onpong, true)
                        resolve()
                    }
                    this.addEventListener("pong", onpong, true)

                    this.dispatchEvent("ping")
                    this.socket.write( buffer, "binary" )
                })
            }
        }
      , pong: { enumerable: false,
            value: function(){
                //TODO, no need to recreate the msg everytime ?
                return new Promise(resolve => {
                    const buffer = new Buffer(2)
                    buffer.writeUInt16BE(0x8a00, 0) // "1000101000000000"

                    this.socket.write(buffer, "binary", () => resolve)
                })
            }
        }
      , uid: { enumerable: true,
            get: function(){ return sockets.get(this).uid }
        }
      , socket: { enumerable: true,
            get: function(){ return sockets.get(this).socket }
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
                      , !!headers["sec-websocket-protocol"] ? `Sec-WebSocket-Protocol: ${headers["sec-websocket-protocol"].split(",")[0]}`
                                                            : ``//TODO
                      , ``, ``
                    ].join('\r\n')


                    if ( headers["connection"].indexOf("keep-alive") != -1 )
                        socket.setKeepAlive(true, 0)
                    socket.write(response)

                    const _socket = new module.exports.WebSocket(socket)
                    upgrades.get(this).sockets.add(_socket)
                    _socket.addEventListener("close", e => {
                        upgrades.get(this).sockets.delete(_socket)
                    }, true)

                    this.dispatchEvent(new SocketEvt(_socket))
                })
            }

            if ( server.listening ) onlisten()
            else server.addListener("listening", onlisten)
        }
      , sockets: { enumerable: true,
            get: function(){
                return [...upgrades.get(this).sockets.values()]
            }
        }
    }
})
