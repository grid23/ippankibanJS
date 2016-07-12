"use strict"

const errors = require("./errors")
const eventWM = require("../lib/Event")._eventWM
const fs = require("fs")
const klass = require("../lib/class").class
const path = require("path")
const typeOf = require("../lib/type").typeOf

const Event = require("../lib/Event").Event
const Node = require("../lib/Node").Node

module.exports.ChangeEvent = klass(Event, {
    constructor: function(e, file, dir){
        Event.call(this, "change")

        eventWM.get(this).file = file
        eventWM.get(this).dir = dir
        eventWM.get(this).path = path.join(dir, file||"./")
    }
  , file: { enumerable: true,
      get: function(){ return eventWM.get(this).file }
    }
  , directory: { enumerable: true,
      get: function(){ return eventWM.get(this).dir }
    }
  , path: { enumerable: true,
      get: function(){ return eventWM.get(this).path }
    }
})

module.exports.ErrorEvent = klass(Event, {
    constructor: function(err){
        Event.call(this, "error")

        eventWM.get(this).error = err
    }
  , error: { enumerable: true,
        get: function(){ return eventWM.get(this).error }
    }
  , throw: { enumerable: true,
        value: function(){
            throw eventWM.get(this).error
        }
    }
})

module.exports.Watcher = klass(Node, statics => {
    const watchers = new WeakMap

    const defaultHandleChange = function(e, file){
        fs.stat(this.path, (err, stats) => {
            if ( err )
              throw err //TODO

            const dir = !!watchers.get(this).isFile ? path.dirname(this.path) : this.path
            this.dispatchEvent( new this.ChangeEvent(e, file, dir) )
        })
    }

    Object.defineProperties(statics, {
        ChangeEvent: { enumerable: true,
            get: function(){ return module.exports.ChangeEvent }
        }
      , ErrorEvent: { enumerable: true,
            get: function(){ return module.exports.ErrorEvent }
        }
    })

    return {
        constructor: function(...args){
            Node.call(this)
            const handleChange = typeOf(args[args.length-1]) == "function" ? args.pop() : defaultHandleChange
            const dict = typeof(args[0]) == "object" ? args.shift()
                       : typeof(args[0]) == "string" ? { path: args.shift() }
                       : {}

            watchers.set(this, Object.create(null))

            this.root = dict.root || "/"
            this.path = dict.path || __filename

            this.recursive = dict.recursive || true
            this.persistent = dict.persistent || true
            this.handleChange = handleChange

            this.ignore = dict.ignore

            fs.stat(this.path, (err, stats) => {
                err = err ? err
                    : !stats.isDirectory() && !stats.isFile() ? new Error("invalid path")
                    : null

                if ( err )
                  return setTimeout(() => this.dispatchEvent( new this.ErrorEvent(err) ), 4)

                watchers.get(this).isFile = stats.isFile()
                fs.watch(this.path, { recursive: this.recursive, peristent: this.persistent }, (e, filename) => {
                    if ( filename && this.ignore.indexOf(filename) !== -1 )
                      return
                    console.log(this.path)
                    this.handleChange(e, filename)
                })
            })
        }
      , ChangeEvent: { enumerable: true,
            get: function(){ return watchers.get(this).ChangeEvent || module.exports.ChangeEvent }
          , set: function(V){
                if ( module.exports.ChangeEvent.isImplementedBy(V) && type(V) == "function" )
                  watchers.get(this).ChangeEvent = V
            }
        }
      , ErrorEvent: { enumerable: true,
            get: function(){ return watchers.get(this).ErrorEvent || module.exports.ErrorEvent }
          , set: function(V){
                if ( module.exports.ErrorEvent.isImplementedBy(V) && type(V) == "function" )
                  watchers.get(this).ErrorEvent = V
            }
        }
      , handleChange: { enumerable: true,
            get: function(){ return watchers.get(this).handleChange }
          , set: function(v){
                if ( typeOf(v) == "function" )
                  watchers.get(this).handleChange = v
            }
        }
      , ignore: { enumerable: true,
            get: function(){ return watchers.get(this).ignore }
          , set: function(v){
                watchers.get(this).ignore = typeOf(v) == "array" ? v : []
            }
        }
      , path: { enumerable: true,
            get: function(){ return path.join(this.root, watchers.get(this).path) }
          , set: function(v){
                if ( typeOf(v) == "string" )
                  watchers.get(this).path = v
            }
        }
      , persistent: { enumerable: true,
            get: function(){ return watchers.get(this).persistent }
          , set: function(v){
                watchers.get(this).persistent = !!v
            }
        }
      , recursive: { enumerable: true,
            get: function(){ return watchers.get(this).recursive }
          , set: function(v){
                watchers.get(this).recursive = !!v
            }
        }
      , root: { enumerable: true,
            get: function(){ return watchers.get(this).root}
          , set: function(v){
                if ( typeOf(v) == "string" )
                  watchers.get(this).root = v
            }
        }
    }
})
