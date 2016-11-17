"use strict"

const eventWM = require("../Event")._eventWM
const errors = require("../errors")
const klass = require("../class").class
const http = require("http")
const https = require("https")
const typeOf = require("../type").typeOf
const parseurl = require("url").parse

const Event = require("../Event").Event
const EventTarget = require("../EventTarget").EventTarget

const CloseEvent = klass(Event, statics => {
    const events = eventWM

    return {
        constructor: function(){
            Event.call(this, "close")
        }
    }
})

const MessageEvent = klass(Event, statics => {
    const events = eventWM

    return {
        constructor: function(e){
            Event.call(this, "message")

            events.get(this).set("data", e.unmask())
        }
      , data: { enumerable: true,
            get: function(){ return events.get(this).get("data") }
        }
      , origin: { enumerable: true,
            get: function(){} //TODO
        }
      , ports: { enumerable: true,
            get: function(){} //TODO
        }
      , source: { enumerable: true,
            get: function(){} //TODO
        }
    }
})

const OpenEvent = klass(Event, statics => {
    const events = eventWM

    return {
        constructor: function(){
            Event.call(this, "open")
        }
    }
})

const SocketMessageEvt = klass(Event, statics => {
    const events = eventWM

    const ops = {
        1: "text"
      , 2: "binary"
      , 8: "close"
      , 9: "ping"
      ,10: "pong"
    }

    return {
        constructor: function({ buffer, fin, rsv1, rsv2, rsv3, opcode, masked, length, start, mask }){
            Event.call(this, "rawmessage")

            events.get(this).set("buffer", buffer)
            events.get(this).set("fin", fin)
            events.get(this).set("rsv1", rsv1)
            events.get(this).set("rsv2", rsv2)
            events.get(this).set("rsv3", rsv3)
            events.get(this).set("opcode", opcode)
            events.get(this).set("op", ops[opcode])
            events.get(this).set("masked", masked)
            events.get(this).set("mask", mask)
            events.get(this).set("length", length)
            events.get(this).set("start", start)
        }
      , fin: { enumerable: true,
            get: function(){ return events.get(this).get("fin") }
        }
      , length: { enumerable: true,
            get: function(){ return events.get(this).get("length") }
        }
      , mask: { enumerable: true,
            get: function(){ return events.get(this).get("mask") }
        }
      , op: { enumerable: true,
            get: function(){ return events.get(this).get("op") }
        }
      , opcode: { enumerable: true,
            get: function(){ return events.get(this).get("opcode") }
        }
      , payload: { enumerable: true,
            get: function(){
                return events.get(this).get("buffer").slice(events.get(this).get("start")).toString("utf8")
            }
        }
      , unmask: { enumerable: true,
            value: function(){
                if ( !events.get(this).get("masked") )
                  return this.payload

                const view = events.get(this).get("buffer").slice(events.get(this).get("start"))
                for ( let [i, v] of view.entries() )
                  view[i] = v ^ events.get(this).get("mask")[i%4]

                return view.toString("utf8")
            }
        }
    }
})

module.exports.WebSocket = klass(EventTarget, statics => {
    const sockets = new WeakMap
    const defaultBinaryType = "blob"

    Object.defineProperties(statics, {
        CONNECTING: { enumerable: true,
            value: 0
        }
      , OPEN: { enumerable: true,
            value: 1
        }
      , CLOSING: { enumerable: true,
            value: 2
        }
      , CLOSED: { enumerable: true,
            value: 3
        }
    })

    const ping = socket => {
        return new Promise(resolve => {
            const buffer = new Buffer(2)
            buffer.writeUInt16BE(0x8900, 0)

            socket.write(buffer, "binary", () => resolve)
        })
    }

    const pong = socket => {
        return new Promise(resolve => {
            const buffer = new Buffer(2)
            buffer.writeUInt16BE(0x8a00, 0)

            socket.write(buffer, "binary", () => resolve)
        })
    }

    return {
        constructor: function(...args){
            sockets.set(this, new Map)
            sockets.get(this).set("readyState", module.exports.WebSocket.CONNECTING)

            const protocols = args.length > 1 && typeOf(args[args.length-1]) == "string" ? args.pop()
                            : typeOf(args[args.length-1]) == "array" ? args.pop().join("")
                            : null
            const url = parseurl(typeOf(args[0]) == "string" ? args.shift()
                      : void function(){ throw new TypeError(errors.TODO) }())

            const protocol = url.protocol
            sockets.get(this).set("resolved_url", `${url.protocol}$//${url.hostname}:${url.port}`)

            const options = {
                host: url.hostname
              , port: url.port
              , method: "GET"
              , headers: {
                    "Connection": "Upgrade"
                  , "Upgrade": "websocket"
                  , "Origin": "*"
                }
              , rejectUnauthorized: false //TODO!
            }

            const onupgrade = (res, socket, head) => {
                sockets.get(this).set("socket", socket)
                sockets.get(this).set("readyState", module.exports.WebSocket.OPEN)
                this.dispatchEvent(new OpenEvent)

                socket.addListener("data", buffer => {
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
                    Event.keepAlive(socketMessageEvt)
                    this.dispatchEvent(socketMessageEvt)

                    if ( socketMessageEvt.cancelled )
                      return

                    switch ( socketMessageEvt.op ) {
                        case "text":
                        case "binary":
                          this.dispatchEvent(new MessageEvent(socketMessageEvt))
                          break
                        case "ping":
                          pong(socket)
                          break
                        default:
                          return
                    }

                    Event.destroy(socketMessageEvt)
                })

                const onend = () => {
                    sockets.get(this).set("readyState", module.exports.WebSocket.CLOSED)
                    this.dispatchEvent("close")
                }
                socket.on("end", onend)
                socket.on("close", onend)
                socket.on("timeout", onend)
            }

            const request = protocol === "wss:"
                          ? https.request(options)
                          : http.request(options)
            request.addListener("upgrade", onupgrade)
            request.end()
        }
      , binaryType: { enumerable: true,
            get: function(){ return sockets.get(this).get("binaryType") || defaultBinaryType }
          , set: function(v){
                if ( ["blob", "arraybuffer"].indexOf(v) !== -1 )
                    sockets.get(this).set("binaryType", v)
            }
        }
      , bufferedAmount: { enumerable: true,
            get: function(){} //TODO
        }
      , close: { enumerable: true,
            value: function(){}
        }
      , extensions: { enumerable: true,
            get: function(){ return "" } //TODO?
        }
      , onclose: { enumerable: true,
            get: function(){ return sockets.get(this).get("onclose") || null }
          , set: function(v){
                if ( !v && sockets.get(this).has("onclose") )
                  this.removeEventListener("close", sockets.get(this).get("onclose"))

                if ( typeOf(v) !== "function" )
                  return

                if ( !!sockets.get(this).has("onclose") )
                  this.removeEventListener("close", sockets.get(this).get("onclose"))

                sockets.get(this).set("onclose", v)
                this.addEventListener("close", sockets.get(this).get("onclose"))
            }
        }
      , onerror: { enumerable: true,
            get: function(){ return sockets.get(this).get("onerror") || null }
          , set: function(v){
                if ( !v && sockets.get(this).has("onerror") )
                  this.removeEventListener("error", sockets.get(this).get("onerror"))

                if ( typeOf(v) !== "function" )
                  return

                if ( !!sockets.get(this).has("onerror") )
                  this.removeEventListener("error", sockets.get(this).get("onerror"))

                sockets.get(this).set("onerror", v)
                this.addEventListener("error", sockets.get(this).get("onerror"))
            }
        }
      , onmessage: { enumerable: true,
            get: function(){ return sockets.get(this).get("onmessage") || null }
          , set: function(v){
                if ( !v && sockets.get(this).has("onmessage") )
                  this.removeEventListener("message", sockets.get(this).get("onmessage"))

                if ( typeOf(v) !== "function" )
                  return

                if ( !!sockets.get(this).has("onmessage") )
                  this.removeEventListener("message", sockets.get(this).get("onmessage"))

                sockets.get(this).set("onmessage", v)
                this.addEventListener("message", sockets.get(this).get("onmessage"))
            }
        }
      , onopen: { enumerable: true,
            get: function(){ return sockets.get(this).get("onopen") || null }
          , set: function(v){
                if ( !v && sockets.get(this).has("onopen") )
                  this.removeEventListener("open", sockets.get(this).get("onopen"))

                if ( typeOf(v) !== "function" )
                  return

                if ( !!sockets.get(this).has("onopen") )
                  this.removeEventListener("open", sockets.get(this).get("onopen"))

                sockets.get(this).set("onopen", v)
                this.addEventListener("open", sockets.get(this).get("onopen"))
            }
        }
      , protocol: { enumerable: true,
            get: function(){ return sockets.get(this).get("protocol") }
        }
      , readyState: { enumerable: true,
            get: function(){ return sockets.get(this).get("readyState") }
        }
      , send: { enumerable: true,
            value: function(msg){ // see WebSocketUpgrade.frame_{text, binary}
                const fin = true
                const masked = true
                const stringify = false
                const opcode = typeOf(msg) == "string" ? 0x1
                             : msg instanceof ArrayBuffer ? 0x2
                             : void function(){ throw new TypeError(errors.TODO) }()

                new Promise((resolve, reject) => {
                    const onerror = e => { reject(e) }

                    try {
                        msg = Buffer.from(msg)
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
                    header[0] = 0x0 |(fin?0x80:0) | opcode
                    header[1] = 0x0 |(masked?0x80:0) | len

                    const frame = Buffer.concat([header, length, mask, payload])

                    sockets.get(this).get("socket").write(frame, "binary", resolve)
                })
                .catch(e => {
                    console.error(e)
                })
            }
        }
      , url: { enumerable: true,
            get: function(){ return sockets.get(this).get("resolved_url") }
        }
    }
})

/*
    "Sec-WebSocket-Version": "13"
  , "Sec-WebSocket-Key": "d9VD4wvK7ndXBCgW5b9Lfg=="
  , "Connection": "Upgrade"
  , "Upgrade": "websocket"
  , "Origin": "*"
*/
