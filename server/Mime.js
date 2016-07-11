"use strict"

const klass = require("../lib/class").class
const mimetypes = require("./mimetypes")
const path = require("path")
const typeOf = require("../lib/type").typeOf

const Collection = require("../lib/Collection").Collection
const Event = require("../lib/Event").Event
const EventTarget = require("../lib/EventTarget").EventTarget
const Model = require("../lib/Model").Model

module.exports.Mime = klass(EventTarget, statics => {
    const mimes = new WeakMap
    const collection = new Collection

    mimetypes.forEach(([path, template, extension]) => {
        collection.addModel({path, template, extension})
    })

    Object.defineProperties(statics, {
        lookup: { enumerable: true,
            value: function(...args){
                const cb = typeOf(args[args.length-1]) == "function" ? args.pop() : ()=>{}
                const lookup = args.shift() || ""
                const extname = (path.extname(lookup).length ? path.extname(lookup) : lookup).slice(1)

                return new Promise((resolve, reject) => {
                    const subset = collection.subset({ extension: extname.toLowerCase() }, cb)
                    subset.addEventListener("subsetready", e => {
                        subset.list("template", (err, {template:templates}) => resolve({ templates }))
                    })
                })
                .catch(e => {
                    return { error: e }
                })
                .then(({error, templates}) => {
                    cb.apply(null, !!error?[error]:[null, ...templates])

                    return templates
                })
            }
        }
      , reverse_lookup: { enumerable: true,
            value: function(...args){
                const cb = typeOf(args[args.length-1]) == "function" ? args.pop() : ()=>{}
                const lookup = args.shift()
                const template = lookup.split(";")[0]

                return new Promise((resolve, reject) => {
                    const subset = collection.subset({ template: template.toLowerCase() }, cb)
                    subset.addEventListener("subsetready", e => {
                        subset.list("extension", (err, {extension:extensions}) => resolve({ extensions }))
                    })
                })
                .catch(e => {
                    return { error: e }
                })
                .then(({error, extensions}) => {
                    cb.apply(null, !!error?[error]:[null, ...extensions])

                    return extensions
                })
            }
        }
    })

    return {
        constructor: function(filepath){
            mimes.set(this, Object.create(null))
            mimes.get(this).filepath = filepath
        }
      , lookup: { enumerable: true,
            value: function(cb){
                return module.exports.Mime.lookup(mimes.get(this).filepath, cb)
            }
        }

    }
})
