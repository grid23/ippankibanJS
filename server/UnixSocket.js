"use strict"

const { class:klass } = require("../lib/class")
const errors = require("./errors")
const { typeOf } = require("../lib/type")

const { Event, _eventWM:eventWM } = require("../lib/Event")
const { EventTarget } = require("../lib/EventTarget")
const { Socket:NetSocket } = require("net")


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

            events.get(this).data = e.unmask()
        }
      , data: { enumerable: true,
            get: function(){ return events.get(this).data }
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

module.exports.UnixSocket = klass(EventTarget, statics => {
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
            sockets.set(this, Object.create(null))
            sockets.get(this).readyState = module.exports.UnixSocket.CONNECTING
            sockets.get(this).path = args[0] && typeOf(args[0]) == "string" ? args.shift()
                                   : function(){ throw new TypeError("socket path expected") }()

            new Promise((resolve, reject) => {
                sockets.get(this).socket = new NetSocket

                const onend = () => {
                    sockets.get(this).readyState = module.exports.UnixSocket.CLOSED
                    this.dispatchEvent("close")
                }
                sockets.get(this).socket.on("end", onend)
                sockets.get(this).socket.on("close", onend)
                sockets.get(this).socket.on("timeout", onend)

                sockets.get(this).socket.addListener("connect", e => {
                    sockets.get(this).readyState = module.exports.UnixSocket.OPEN
                    this.dispatchEvent(new OpenEvent)

                    sockets.get(this).socket.addListener("data", buffer => {
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
                            case "binary":
                              this.dispatchEvent(new MessageEvent(socketMessageEvt))
                              break
                            case "ping":
                              pong(sockets.get(this).socket)
                              break
                            default:
                              return
                        }
                    })

                })

                sockets.get(this).socket.connect(sockets.get(this).path)
            })
        }
      , binaryType: { enumerable: true,
            get: function(){ return sockets.get(this).binaryType || defaultBinaryType }
          , set: function(v){
                if ( ["blob", "arraybuffer"].indexOf(v) !== -1 )
                    sockets.get(this).binaryType = v
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
            get: function(){ return sockets.get(this).onclose || null }
          , set: function(v){
                if ( typeOf(v) !== "function" )
                  return

                if ( !!sockets.get(this).onclose )
                  this.removeEventListener("close", sockets.get(this).onclose)

                sockets.get(this).onclose = v
                this.addEventListener("close", sockets.get(this).onclose)
            }
        }
      , onerror: { enumerable: true,
            get: function(){ return sockets.get(this).onerror || null }
          , set: function(){
                if ( typeOf(v) !== "function" )
                  return

                if ( !!sockets.get(this).onerror )
                  this.removeEventListener("error", sockets.get(this).onerror)

                sockets.get(this).onerror = v
                this.addEventListener("error", sockets.get(this).onerror)
            }
        }
      , onmessage: { enumerable: true,
            get: function(){ return sockets.get(this).onmessage || null }
          , set: function(){
                if ( typeOf(v) !== "function" )
                  return

                if ( !!sockets.get(this).onmessage )
                  this.removeEventListener("message", sockets.get(this).onmessage)

                sockets.get(this).onerror = v
                this.addEventListener("message", sockets.get(this).onmessage)
            }
        }
      , onopen: { enumerable: true,
            get: function(){ return sockets.get(this).onopen || null }
          , set: function(){
                if ( typeOf(v) !== "function" )
                  return

                if ( !!sockets.get(this).onopen )
                  this.removeEventListener("open", sockets.get(this).onopen)

                sockets.get(this).onerror = v
                this.addEventListener("open", sockets.get(this).onopen)
            }
        }
      , protocol: { enumerable: true,
            get: function(){ return sockets.get(this).protocol }
        }
      , readyState: { enumerable: true,
            get: function(){ return sockets.get(this).readyState }
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

                    sockets.get(this).socket.write(frame, "binary", resolve)
                })
                .catch(e => {
                    console.error(e)
                    throw e
                })
            }
        }
      , url: { enumerable: true,
            get: function(){ return sockets.get(this).resolved_url }
        }
    }
})
