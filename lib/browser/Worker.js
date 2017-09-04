"use strict"
const klass = require("../class").class

const Event = require("../Event").Event
const EventTarget = require("../EventTarget").EventTarget

//TODO errors and stuff

module.exports.Worker = klass(EventTarget, statics => {
    const workers = new WeakMap
    const rworkerbody = /^function worker([^\(]*)\(\)([^\(]*)\{([\s\S]*)\}$/im

    return {
        constructor: function(script){
            workers.set(this, Object.create(null))

            let body

            try {
                body = rworkerbody.exec(script.toString())[3]
            } catch(e){
                //TODO
            }

            let blob = new Blob([body], { type: "application/javascript" })
            workers.get(this).cp = new Worker(URL.createObjectURL(blob))

        }
      , message: { enumerable: true,
            value: function(msg){
                let channel = new MessageChannel

                workers.get(this).cp.postMessage(msg, [channel.port2])
                return channel.port1
            }
        }
      , kill: { enumerable: true,
            value: function(){
                return workers.get(this).cp.terminate()
            }
        }
    }
})
