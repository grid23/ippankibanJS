"use strict"

const crypto = require("crypto")
const errors = require("./errors")
const eventWM = require("../lib/Event")._eventWM
const klass = require("../lib/class").class
const typeOf = require("../lib/type").typeOf
//const path = require("path")

const Event = require("../lib/Event").Event
const Node = require("../lib/Node").Node
const SecureServer = require("./SecureServer").SecureServer
const Server = require("./Server").Server
const Socket = require("net").Socket
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
                  view[i] = v ^ this.mask[i%4]

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

    const pong =  socket => {
        return new Promise(resolve => {
            const buffer = new Buffer(2)
            buffer.writeUInt16BE(0x8a00, 0) // "1000101000000000"

            socket.write(buffer, "binary", () => resolve)
        })
    }

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
                if ( socketMessageEvt.cancelled ) {
                    return
                }

                switch ( socketMessageEvt.op ) {
                    case "text":
                      this.dispatchEvent(new SocketTextMessageEvt(socketMessageEvt))
                      break
                    case "binary":
                      this.dispatchEvent(new SocketBinaryMessageEvt(socketMessageEvt))
                      break
                    case "pong":
                      this.dispatchEvent(new SocketPongEvt)
                      break
                    case "ping":
                      pong(this.socket)
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

            this.socket.on("end", onend)
            this.socket.on("close", onend)
            this.socket.on("timeout", onend)

            const pingpong = () => {
                if ( close )
                  return


                const op =  this.ping()
                op.catch(e => this.close())
                op.then(() => {
                    setTimeout(pingpong, 25000)
                })
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
      , frame_binary: { enumerable: true, //TODO TEST
            //value: function(msg, {fin, mask:masked}={ fin:true }){
            value: function(...args){
                const cb = typeOf(args[args.length-1]) == "function" ? args.pop() : Function.prototype
                const dict = typeOf(args[args.length-1]) == "object" ? args.pop() : {}
                const msg = !!args[0] || Object.prototype.toString(args[0])

                const fin = typeOf(dict.fin) == "boolean" ? dict.fin : true
                const masked = !!dict.mask || !!dict.masked
                const file = !!dict.file

                return new Promise((resolve, reject) => {
                    const onerror = e => { cb(e); reject(e) }

                    if ( file && typeOf(args[0]) == "string" ) {
                        fs.readFile(args.shift(), (err, data) => {
                            if ( err )
                              return onerror(err)
                            resolve(data)
                        })
                    } else if ( args[0] instanceof Buffer )
                      resolve(args.shift())
                    else {
                        try {
                            const buffer = Buffer.from(args.shift())
                        } catch(e) {
                            onerror(e)
                            reject(e)
                        }
                    }
                }).then(msg=>{
                    return new Promise((resolve, reject) => {
                        const onerror = e => { cb(e); reject(e) }

                        const payload = Buffer.from(msg)
                        const header = Buffer.alloc(2)
                        const {len, length} = function(){
                            const len = payload.length < 0x7e ? payload.length
                                      : payload.length <= 0xffff ? 0x7e
                                      : 0x7f
                            const length = len < 0x7e ? Buffer.alloc(0)
                                         : len == 0x7e ? function(buffer){ buffer.writeUInt16BE(payload.length); return buffer }(Buffer.alloc(2))
                                         :  function(buffer){ //TODO TEST!, find a pretttier way?
                                                const bin = payload.length.toString(2).split("")
                                                buffer.writeUInt32BE(parseInt(bin.splice(-32).join("")||"0", 2), 4)
                                                buffer.writeUInt32BE(parseInt(bin.splice(-32).join("")||"0", 2), 0)
                                                return buffer
                                            }(Buffer.alloc(8))

                            return { len, length }
                        }()
                        const mask = !!masked ? Buffer.from( new Uint32Array(4).fill(0) ) : Buffer.alloc(0) //TODO add mask
                        header[0] = 0x0 |(fin?0x80:0) | 0x2
                        header[1] = 0x0 |(masked?0x80:0) | len

                        const frame = Buffer.concat([header, length, mask, payload])

                        this.socket.write(frame, "binary", resolve)
                    })
                })
            }
        }
      , frame_text: { enumerable: true,
            //value: function(msg, {fin, mask:masked, stringify}={ fin:true }){
            value: function(...args){
                const cb = typeOf(args[args.length-1]) == "function" ? args.pop() : Function.prototype
                const dict = typeOf(args[args.length-1]) == "object" ? args.pop() : {}

                const fin = typeOf(dict.fin) == "boolean" ? dict.fin : true
                const masked = !!dict.mask || !!dict.masked
                const stringify = !!dict.stringify

                return new Promise((resolve, reject) => {
                    const onerror = e => { cb(e); reject(e) }

                    let msg
                    try {
                         msg = typeOf(args[0]) == "string" ? args.shift()
                             : !!stringify ? JSON.stringify(args.shift())
                             : void function(){ throw new TypeError(errors.TODO) }()
                    } catch(e){ return onerror(e)  }

                    const payload = Buffer.from(msg)
                    const header = Buffer.alloc(2)
                    const {len, length} = function(){
                        const len = payload.length < 0x7e ? payload.length
                                  : payload.length <= 0xffff ? 0x7e
                                  : 0x7f
                        const length = len < 0x7e ? Buffer.alloc(0)
                                     : len == 0x7e ? function(buffer){ buffer.writeUInt16BE(payload.length); return buffer }(Buffer.alloc(2))
                                     :  function(buffer){ //TODO TEST!, find a pretttier way?
                                            const bin = payload.length.toString(2).split("")
                                            buffer.writeUInt32BE(parseInt(bin.splice(-32).join("")||"0", 2), 4)
                                            buffer.writeUInt32BE(parseInt(bin.splice(-32).join("")||"0", 2), 0)
                                            return buffer
                                        }(Buffer.alloc(8))

                        return { len, length }
                    }()
                    const mask = !!masked ? Buffer.from( new Uint32Array(4).fill(0) ) : Buffer.alloc(0) //TODO add mask
                    header[0] = 0x0 |(fin?0x80:0) | 0x1
                    header[1] = 0x0 |(masked?0x80:0) | len

                    const frame = Buffer.concat([header, length, mask, payload])

                    this.socket.write(frame, "binary", resolve)
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
        constructor: function(server, protocols){
            Node.call(this)
            upgrades.set(this, Object.create(null))
            upgrades.get(this).sockets = new Set
            upgrades.get(this).protocols = typeOf(protocols) == "array" ? protocols.filter(p=>typeOf(p)=="string")
                                         : typeOf(protocols) == "string" ? [protocols]
                                         : "*"

            if ( !Server.isImplementedBy(server) && !SecureServer.isImplementedBy(server) )
              throw new TypeError(errors.TODO)
            upgrades.get(this).server = server

            const onlisten = e => {
                if ( !!e )
                  server.removeListener("listening", onlisten)

                upgrades.get(this).server.on("secureConnection", socket => {
                    socket.on("data", data => { console.log("secureconnection?", data.toString()) })
                })

                upgrades.get(this).server.on("upgrade", ({headers}, socket, head) => {
                    console.log("UPG", headers)
                    const shasum = crypto.createHash("sha1")
                    shasum.update(headers["sec-websocket-key"] + magic_uuid, 'binary')
                    const hash = shasum.digest("base64")
                    const protocol = !!headers["sec-websocket-protocol"]
                                    ? headers["sec-websocket-protocol"].split(",")
                                        .filter(p => {
                                            return upgrades.get(this).protocols === "*"
                                                 ? true
                                                 : upgrades.get(this).protocols.indexOf(thisp.trim()) !== -1
                                        })[0]
                                    : null
                    const response = []

                    // TODO define how to validate the upgrade or not
                    const connect = headers["sec-websocket-protocol"] && !protocol ? false
                                  : true
                    if ( connect ) {
                        response.push(`HTTP/1.1 101 Switching Protocols`)
                        response.push(`Upgrade: websocket`)
                        response.push(`Connection: ${headers["connection"]}`)
                        response.push(`Sec-WebSocket-Accept: ${hash}`)
                        if ( protocol )
                          response.push(`Sec-WebSocket-Protocol: ${protocol}`)
                    } else {
                        response.push(`403 Forbidden`)
                    }

                    // add two empty lines as per rfc
                    response.push(``)
                    response.push(``)

                    if ( headers["connection"].indexOf("keep-alive") != -1 )
                        socket.setKeepAlive(true, 0)
                    socket.write(response.join('\r\n'))

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
