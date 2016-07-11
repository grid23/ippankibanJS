"use strict"

const eventWM = require("../Event")._eventWM
const klass = require("../class").class
const typeOf = require("../type").typeOf
const socket = require("./sockets/models").socket

const Event = require("../Event").Event
const Model = require("../Model").Model
const Node = require("../Node").Node


module.exports.Collection = klass(Node, statics => {
    const collections = new WeakMap

    return {
        constructor: function(...args){
            Node.call(this)
            collections.set(this, Object.create(null))
            collections.get(this).chain = new Map
            collections.get(this).models = new Set
            collections.get(this).op = Promise.resolve()

            this.addModel.apply(this, args)
        }
      , addModel: { enumerable: true,
            value: function(...args){
                const models = args[0] && args[0][Symbol.iterator] ? args[0]
                             : args.length > 1 ? args
                             : args.length == 1 ? [args[0]]
                             : []

                models.forEach(model => {
                    try {
                        model = Model.isImplementedBy(model) ? model
                              : new this.Model(model)
                    } catch(e){
                        this.dispatchEvent("error", e)
                    }

                    collections.get(this).models.add(model)
                    collections.get(this).chain.set(model.uid, model)
                })
            }
        }
      , find: { enumerable: true,
            value: function(...args){
                const cb = typeOf(args[args.length-1]) == "function" ? args.pop() : Function.prototype
                const condition = typeOf(args[0]) == "object" ? args.shift() : {}

                Object.keys(condition).forEach(key => {
                    const _type = typeOf(condition[key])
                    condition[key] = _type == "string" ? ["v", `return v === "${condition[key]}"`]
                                   : _type != "function" ? ["v", `return v === ${condition[key]}`]
                                   : ["v", `return (${condition[key].toString()}).call(null, v)`]
                })


                collections.get(this).op =  collections.get(this).op.then(()=>{
                    return Promise.all(this.models.map(model=>model.op))
                    .then(()=>{
                        return new Promise((resolve, reject) => {
                            let port = socket.message({
                                chain: [...collections.get(this).chain.keys()]

                              , cmd: "find"
                              , data: condition
                            })

                            port.onmessage = ({data:response}) => {
                                if ( !!response.error )
                                  reject(response.message),
                                  cb(new Error(response.message)),
                                  this.dispatchEvent("error", response.message)
                                else {
                                    const models = []
                                    response.models.forEach(uid => {
                                        const model = collections.get(this).chain.get(uid)

                                        if ( model )
                                          models.push(model)
                                    })

                                    cb(null, models)
                                    resolve(models)
                                }
                            }
                        })
                    })
                })

                return collections.get(this).op
            }
        }
      , forEach: { enumerable: true,
            value: function(handler = ()=>{}){
                return this.models.forEach(handler)
            }
        }
      , hasModel: { enumerable: true,
            value: function(...args){
                let hit = true
                const models = args[0] && args[0][Symbol.iterator] ? args.shift()
                             : args.length > 1 ? args
                             : args.length == 1 ? [args.shift()]
                             : []

                models.forEach(model => {
                    model = Model.isImplementedBy(model) ? model : null

                    if ( !collections.get(this).models.has(model) )
                      hit = false
                })

                return hit
            }
        }
      , list: { enumerable: true,
            value: function(...args){
                let cb = typeOf(args[args.length-1]) == "function" ? args.pop() : Function.prototype
                let data = args.length > 1 ? args : args[0]

                collections.get(this).op = collections.get(this).op.then(() => {
                    return new Promise((resolve, reject) => {
                        let port = socket.message({
                            chain: [...collections.get(this).chain.keys()]

                          , cmd: "list"
                          , data
                        })

                        port.onmessage = ({data:response}) => {
                            if ( !!response.error )
                              reject(response.message),
                              cb(new Error(response.message)),
                              this.dispatchEvent("error", response.message)
                            else {
                                cb(null, response.lists)
                                resolve(response.lists)
                            }
                        }

                    })
                })

                return collections.get(this).op
            }
        }
      , Model: { enumerable: true,
            get: function(){ return collections.get(this).Model || Model }
          , set: function(v){
              if ( Model.isImplementedBy(v) && typeOf(v) == "function" )
                collections.get(this).Model = v
            }
        }
      , models: { enumerable: true,
            get: function(){
                return [...collections.get(this).models]
            }
        }
      , op: { enumerable: true,
            get: function(){ return this.operation }
        }
      , operation: { enumerable: true,
            get: function(){ return collections.get(this).op }
        }
      , removeModel: { enumerable: true,
            value: function(...args){
                const models = args[0] && args[0][Symbol.iterator] ? args[0]
                             : args.length > 1 ? args
                             : args.length == 1 ? [args[0]]
                             : []

                models.forEach(model => {
                    model = Model.isImplementedBy(model) ? model : null

                    if ( model )
                      collections.get(this).models.delete(model),
                      collections.get(this).chain.delete(model.uid)
                })
            }
        }
      , size: { enumerable: true,
            get: function(){ return collections.get(this).models.size }
        }

      , sort: { enumerable: true,
            value: function(...args){
                const cb = typeOf(args[args.length-1]) == "function" ? args.pop() : Function.prototype
                const handler = typeOf(args[args.length-1]) == "function" ? args.pop() : ()=>0
                const keys = (args[0] && args[0][Symbol.iterator] ? args.shift() : []).filter(key => typeOf(key) == "string")

                collections.get(this).op = collections.get(this).op.then(()=>{
                    return Promise.all(this.models.map(model=>model.op))
                    .then(()=>{
                        return new Promise((resolve, reject) => {
                            let port = socket.message({
                                chain: [...collections.get(this).chain.keys()]

                              , cmd: "sort"
                              , data: {
                                    handler: ["a", "b", ` return (${handler.toString()})(a, b)`]
                                  , keys
                                }
                            })

                            port.onmessage = ({data:response}) => {
                                if ( !!response.error )
                                  reject(response.message),
                                  cb(new Error(response.message)),
                                  this.dispatchEvent("error", response.message)
                                else {
                                    const sorted = []

                                    response.models.forEach(uid => {
                                        const model = collections.get(this).chain.get(uid)

                                        if ( model )
                                          sorted.push(model)
                                    })

                                    cb(null, sorted)
                                    resolve(sorted)
                                }
                            }
                        })
                    })
                })

                return collections.get(this).op
            }
        }

      , subset: { enumerable: true,
            value: function(...args){
                const subset = new module.exports.Collection
                const condition = typeOf(args[0]) == "object" ? args[0] : {}

                this.find(condition, (err, models) => {
                    if ( err )
                      return subset.dispatchEvent("error", err)

                    subset.addModel(models)
                    subset.dispatchEvent("subsetready")
                })

                return subset
            }
        }
    }
})
