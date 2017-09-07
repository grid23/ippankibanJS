"use strict"

const { DEBUG, VERBOSE } = require("../env")

const errors = require("../errors")
const eventWM = require("../Event")._eventWM
const klass = require("../class").class
const objectify = require("../Serializer").Serializer.objectify
const typeOf = require("../type").type
const socket = require("./sockets/models").socket

const Event = require("../Event").Event
const Node = require("../Node").Node
const UID = require("../UID").UID

const ModelEvt = klass(Event, statics => {
    return {
        constructor: function(type, keys = [], detail = {}){
            Event.call(this, type, detail)
            eventWM.get(this).set("keys", Object.freeze(keys))
        }
      , keys: { enumerable: true,
            get: function(){
                return eventWM.get(this).get("keys")
            }
        }
    }
})

module.exports.AddEvt = klass(ModelEvt, statics => {
    Object.defineProperties(statics, {
        NAME: { enumerable: true,
            value: "add"
        }
    })
    return {
        constructor: function(keys = []){
            ModelEvt.call(this, module.exports.AddEvt.NAME, keys)
        }
    }
})

module.exports.BusyEvt = klass(Event, statics => {
    Object.defineProperties(statics, {
        NAME: { enumerable: true,
            value: "busy"
        }
    })
    return {
        constructor: function(detail = {}){
            Event.call(this, module.exports.BusyEvt.NAME, { bubbles: false, detail })
        }
    }
})

module.exports.IdleEvt = klass(Event, statics => {
    Object.defineProperties(statics, {
        NAME: { enumerable: true,
            value: "idle"
        }
    })
    return {
        constructor: function(detail = {}){
            Event.call(this, module.exports.IdleEvt.NAME, { bubbles: false, detail })
        }
    }
})

module.exports.RemoveEvt = klass(ModelEvt, statics => {
    Object.defineProperties(statics, {
        NAME: { enumerable: true,
            value: "remove"
        }
    })
    return {
        constructor: function(keys = {}){
            ModelEvt.call(this, module.exports.RemoveEvt.NAME, keys)
        }
    }
})

module.exports.UpdateEvt = klass(ModelEvt, statics => {
    Object.defineProperties(statics, {
        NAME: { enumerable: true,
            value: "update"
        }
    })
    return {
        constructor: function(keys = []){
            ModelEvt.call(this, module.exports.UpdateEvt.NAME, keys)
        }
    }
})

module.exports.TreeChangeEvt = klass(ModelEvt, statics => {
    Object.defineProperties(statics, {
        NAME: { enumerable: true,
            value: "treechange"
        }
    })
    return {
        constructor: function(keys = []){
            ModelEvt.call(this, module.exports.TreeChangeEvt.NAME, keys, { bubbles: false })
        }
    }
})

module.exports.Model = klass(Node, statics => {
    const models = new WeakMap

    const treechange = (model, keys) => {
        if ( !model.hasChildNodes() )
          return

        model.childNodes.forEach(node => {
            node.dispatchEvent( new module.exports.TreeChangeEvt(keys) )
        })
    }

    return {
        constructor: function(){
            Node.call(this)

            models.set(this, new Map)
            models.get(this).set("hooks", Object.create(null))
            models.get(this).set("op", Promise.resolve())
            models.get(this).set("uid", UID.uid())
            models.get(this).set("busy", false)

            this.addEventListener(module.exports.TreeChangeEvt.NAME, e =>  {
                if ( e.target !== this )
                  return

                treechange(this, e.keys)
            }, true)

            if ( arguments.length )
              this.write.apply(this, arguments)
        }
      , chain: { enumerable: true,
            get: function(){
                let chain = []
                let node = this

                while ( !!node )
                  chain.push(node.uid),
                  node = node.parentNode

                return chain
            }
        }
      , hook: { enumerable: true,
            value: function(key, fn=v=>v){
                key = typeOf(key) == "string" ? key : Object.prototype.toString.call(key)

                models.get(this).get("hooks")[key] = fn
            }
        }
      , op: { enumerable: true,
            get: function(){ return this.operation }
        }
      , operation: { enumerable: true,
            get: function(){ return models.get(this).get("op") }
        }
      , read: { enumerable: true,
            value: function(...args){
                models.get(this).set("op", models.get(this).get("op").then(()=>{
                    return new Promise((resolve, reject) => {
                        let trace = args.length > 1 && typeOf(args[args.length-1]) == "boolean" ? args.pop()
                                 : false
                        let cb = typeOf(args[args.length-1]) == "function" ? args.pop() : Function.prototype
                        let data = args.length > 1 ? args : args[0]

                        if ( !models.get(this).get("busy") )
                          models.get(this).set("busy", true),
                          this.dispatchEvent(new module.exports.BusyEvt)

                        let port = socket.message({
                            chain: this.chain
                          , cmd: trace?"trace":"read"
                          , data
                        })

                        port.onmessage = e => {
                            if ( !!e.data.error ) {
                                const error = new Error(e.data.message)
                                this.dispatchEvent("error", error)
                                cb(error)
                                reject(error)
                            } else {
                                let keys = Object.keys(e.data.data)
                                let clone = Object.create(e.data.data)

                                keys.forEach(k=>{
                                    if ( models.get(this).get("hooks")[k] ) {
                                        if ( !trace ) clone[k] = models.get(this).get("hooks")[k](clone.__proto__[k])
                                        else
                                          clone[k] = [].concat(clone.__proto__[k]),
                                          clone[k].unshift({ value: models.get(this).get("hooks")[k](clone[k][0].value), meta: { origin: "hook" }  })

                                    }
                                    else {
                                        if ( trace ) clone[k] = [].concat(clone.__proto__[k])
                                        else clone[k] = clone.__proto__[k]
                                    }
                                })

                                this.dispatchEvent("read", clone)
                                cb(null, clone)
                                resolve(clone)
                            }


                            clearTimeout(models.get(this).get("idleTimer"))
                            models.get(this).set("idleTimer", setTimeout(() => {
                                models.get(this).set("busy", true)
                                this.dispatchEvent(new module.exports.IdleEvt)
                            }, 4))
                        }
                    })
                }))

                return models.get(this).get("op")
            }
        }
      , trace: { enumerable: true,
            value: function(...args){
                return this.read.apply(this, [].concat(args, true))
            }
        }
      , write: { enumerable: true,
            value: function(...args){
                models.get(this).set("op", models.get(this).get("op").then(()=>{
                    return new Promise((resolve, reject) => {
                          let cb = typeOf(args[args.length-1]) == "function" ? args.pop() : Function.prototype
                          let meta = args.length > 2 && typeOf(args[args.length-1]) == "object" ? args.pop()
                                   : null

                          let data = args.length == 2 && typeOf(args[0]) == "string" ? { [args[0]] : typeof args[1] == "undefined" ? "__undefined" : args[1]  }
                                   : args.length == 1 && typeOf(args[0]) == "string" ? function(){
                                        try { return JSON.parse(args[0]) }
                                        catch(e) {
                                            try { return objectify(args[0])  }
                                            catch(e) {
                                                console.error(e)
                                                throw e //TODO
                                            }
                                        }
                                    }()
                                   : args[0]

                          if ( !models.get(this).get("busy") )
                            models.get(this).set("busy", true),
                            this.dispatchEvent(new module.exports.BusyEvt)

                          let port = socket.message({
                              cmd: "write"
                            , data, meta
                            , chain: this.chain
                          })

                          port.onmessage = e => {
                              if ( VERBOSE )
                                console.log(`[${__filename}, Model.write()] port.onmessage(e), e.data`, e.data)

                              if ( !!e.data.error )
                                reject(e.data.message),
                                cb(new Error(e.data.message)),
                                this.dispatchEvent("error", e.data.message)
                              else {
                                  if ( typeOf(e.data.add) == "array" && e.data.add.length > 0 )
                                    this.dispatchEvent(new module.exports.AddEvt(e.data.add))

                                  if ( typeOf(e.data.remove) == "array" && e.data.remove.length > 0 )
                                    this.dispatchEvent(new module.exports.RemoveEvt(e.data.remove))

                                  if ( typeOf(e.data.update) == "array" && e.data.update.length > 0 )
                                    this.dispatchEvent(new module.exports.UpdateEvt(e.data.update)),
                                    treechange(this, e.data.update)


                                  cb(null)
                                  resolve(Date.now())
                              }

                              clearTimeout(models.get(this).get("idleTimer"))
                              models.get(this).set("idleTimer", setTimeout(() => {
                                  models.get(this).set("busy", false)
                                  this.dispatchEvent(new module.exports.IdleEvt)
                              }, 4))
                          }
                    })
                }))

                return models.get(this).get("op")
            }
        }
      , uid: { enumerable: true,
            get: function(){ return models.get(this).get("uid") }
        }
    }
})
