"use strict"

const errors = require("../../errors")
const eventWM = require("../../Event")._eventWM
const exec = require("child_process").exec
const fork = require("child_process").fork
const fs = require("fs")
const klass = require("../../class").class
const path = require("path")
const { spawn, spawnSync } = require("child_process")
const net = require("net")
const singleton = require("../../class").singleton

const Event = require("../../Event").Event
const EventTarget = require("../../EventTarget").EventTarget
const UID = require("../../UID").UID

const PATH_SOCKET = function(){
    const uid = UID.uid()
    const mode = 0O0777 & (~process.umask())
    const fpath = `/tmp/${uid}`
    fs.mkdirSync(fpath, mode)

    return fpath
}()
const PATH_ROOT = path.resolve(process.cwd(), __dirname)

const MessageEvt = klass(Event, statics => {
    Object.defineProperties(statics, {
        NAME: { enumerable: true,
            value: "message"
        }
    })

    return {
        constructor: function(data){
            Event.call(this, MessageEvt.NAME)

            eventWM.get(this).set("data", Object.freeze(data))
        }
      , data: { enumerable: true,
            get: function(){
                return eventWM.get(this).get("data")
            }
        }
    }
})

const MessagePort = klass(EventTarget, statics => {
    const ports = new WeakMap

    return {
        constructor: function(){
            ports.set(this, Object.create(null))
        }
      , onmessage: { enumerable: true,
            set: function(v){
                if ( !!ports.get(this).messageHandler )
                  this.removeEventListener("message", ports.get(this).messageHandler)

                ports.get(this).messageHandler = EventTarget.isEventListener(v) ? v : function(){}
                this.addEventListener("message", ports.get(this).messageHandler)
            }
          , get: function(){ return ports.get(this).messageHandler }
        }
    }
})

const Socket = singleton(statics => {
    const servers = new Set
    const cp = fork(path.join(PATH_ROOT, "models-cp.js"), process.argv.slice(2), { execArgv: process.execArgv  })
    const pid = cp.pid
    let ready = new Promise((resolve, reject) => {
        const onmessage = e => {
            resolve()
        }

        cp.once("message", onmessage)
    })

    const oncpexit = e => { throw new Error("models cp/socket down") }
    const onprocessexit = e => {
        console.log(`[ippankiban] attempting to delete ${PATH_SOCKET}`)
        spawn("rm", ["-rf", PATH_SOCKET])
        exec(`kill -9 ${pid}`)
    }
    cp.on("exit",    oncpexit)
    process.on("exit", onprocessexit)
    process.on("SIGINT", e => process.exit())
    process.on("SIGTERM", e => process.exit())

    return {
        message: { enumerable: true,
            value: function(msg){
                const messagePort = new MessagePort

                ready = ready.then(() => {
                    return new Promise((resolve, reject) => {

                        const socket_path = path.join(PATH_SOCKET, `${UID.uid()}.sock`)
                        const server = net.createServer(socket => {
                            const chunks = []

                            socket.on("data", chunk => {
                                chunks.push(chunk.toString())
                            })

                            socket.on("end", () => {
                                let data

                                try {
                                    data = JSON.parse(chunks.join(""))
                                } catch(e){
                                    //TODO
                                    data = { error: "unable to parse data" }
                                }

                                socket.on("close", ()=>{
                                    resolve(data)
                                    messagePort.dispatchEvent(new MessageEvt(data))
                                })

                                server.close()
                            })
                        })

                        servers.add(server)
                        server.on("listening", () => {
                            cp.send({
                                data: msg
                              , ports: [socket_path] //path to the .sock file
                            })
                        })

                        server.listen(socket_path)
                    })
                })

                return messagePort
            }
        }
    }
})

module.exports.socket = new Socket
