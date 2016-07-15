"use strict"

const crypto = require("crypto")
const errors = require("./errors")
const fs = require("fs")
const http = require("http")
const klass = require("../lib/class").class
const net = require("net")
const path = require("path")
const tls = require("tls")
const typeOf = require("../lib/type").typeOf

const Event = require("../lib/Event").Event
const Route = require("../lib/Route").Route
const Router = require("../lib/Router").Router

module.exports.WebSocketServer = klass(statics => {
    const servers = new WeakMap
    const magic_uuid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

    return {
        constructor: function(port){
            servers.set(this, Object.create(null))

            if ( port && typeOf(port) == "number" )
              servers.get(this).port = port

            servers.get(this).server = new http.Server

            servers.get(this).server.on("request", (request, response) => {
                response.statusCode = 200
                response.end()
            })

            servers.get(this).server.on("upgrade", ({headers}, socket, head) => {
                console.log(headers)
                const shasum = crypto.createHash("sha1")
                shasum.update(headers["sec-websocket-key"] + magic_uuid, 'binary')
                const hash = shasum.digest("base64")

                const response = [
                    `HTTP/1.1 101 Switching Protocols`
                  , `Upgrade: websocket`
                  , `Connection: ${headers["connection"]}`
                  , `Sec-WebSocket-Accept: ${hash}`
                  , ``, ``
                ].join('\r\n')

                if ( headers["connection"].indexOf("keep-alive") != -1 )
                    socket.setKeepAlive(true, 0)
                socket.write(response)

                socket.on("data", buffer => {
                    console.log("data", buffer)
                })
            })
        }
      , listen: { enumerable: true,
            value: function(port){
                if ( port && typeOf(port) == "number" )
                  servers.get(this).port = servers.get(this).port || port

                if ( !servers.get(this).port )
                  throw new Error(errors.TODO)

                if ( !!servers.get(this).server && !!servers.get(this).server.listening )
                  return

                return servers.get(this).server.listen(servers.get(this).port)
            }
        }
    }
})

module.exports.NetServer = klass(Router, statics => {
    const servers = new WeakMap
    const magic_uuid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

    return {
        constructor: function(port){
            Router.apply(this, arguments)
            servers.set(this, Object.create(null))

            if ( port && typeOf(port) == "number" )
              servers.get(this).unixsocket = false,
              servers.get(this).port = port
            else if ( port && typeOf(port) == "string" )
              servers.get(this).unixsocket = true,
              servers.get(this).port = port
        }
      , listen: { enumerable: true,
            value: function(port){
                if ( port && typeOf(port) == "number" )
                  servers.get(this).unixsocket = false,
                  servers.get(this).port = port
                else if ( port && typeOf(port) == "string" )
                  servers.get(this).unixsocket = true,
                  servers.get(this).port = port

                if ( !!servers.get(this).server && !!servers.get(this).server.listening )
                  return

                servers.get(this).server = !this.secure || !this.options
                                         ? new net.Server
                                         : new tls.Server(this.options)

                servers.get(this).server.on("upgrade", (req, socket) => {
                    console.log("upgrade")
                })

                servers.get(this).server.on("connection", socket => {
                    socket.on("data", buffer => {
                        const headers = {}

                        buffer.toString().split(/\r|\n/).forEach(header => {
                            const idx = header.search(":")

                            if ( idx == -1 )
                              return

                            headers[header.slice(0,idx).trim()] = header.slice(idx+1).trim()
                        })

                        const hash = crypto.createHash("sha1")
                        hash.update(headers["Sec-WebSocket-Key"] + magic_uuid, 'binary')

                        const response = [
                            ``
                          , `HTTP/1.1 101 Switching Protocols`
                          , `Upgrade: websocket`
                          , `Connection: ${headers.Connection}`
                          , `Sec-WebSocket-Accept: ${hash.digest("base64")}`
                          , ``
                        ].join("\n\r")

                        console.log(response)
                        socket.write(response, "utf-8", () => {
                            console.log("written")
                        })
                    })

                    socket.on("close", () => {
                        console.log("close")
                    })

                    socket.on("end", () => {
                        console.log("end")
                    })
                })

                servers.get(this).server.on("listening", () => {
                    console.log("foo")
                })

                return servers.get(this).server.listen(servers.get(this).port)
            }
        }
    }
})
