"use strict"

const errors = require("./errors")
const eventWM = require("../lib/Event")._eventWM
const klass = require("../lib/class").class
const path = require("path")
const typeOf = require("../lib/type").typeOf

const Event = require("../lib//Event").Event
const Node = require("../lib/Node").Node
const Watcher = require("./Watcher").Watcher

module.exports.BuildEvent = klass(Event, {
    constructor: function(){
        Event.call(this, "build")
    }
})

module.exports.ErrorEvent = klass(Event, {
    constructor: function(err){
        Event.call(this, "error", err)
    }
})

module.exports.IBuilder = klass(Node, statics => {
    const builders = new WeakMap
    const defaultHandleCondition = () => true

    Object.defineProperties(statics, {
        BuildEvent: { enumerable: true,
            get: function(){ return module.exports.BuildEvent }
        }
      , ErrorEvent: { enumerable: true,
            get: function(){ return module.exports.ErrorEvent }
        }
    })

    return {
        constructor: function(...args){
            Node.call(this)

            const handleCondition = typeOf(args[args.length-1]) == "function" ? args.pop() : defaultHandleCondition
            const dict = typeOf(args[0]) == "object" ? args.shift()
                       : typeOf(args[0]) == "string" ? { path: args.shift() }
                       : {}

            builders.set(this, Object.create(null))
            this.root = dict.root || process.cwd()
            this.to = dict.to
            this.from = dict.from
            this.handleCondition = handleCondition
        }
      , build: { enumerable: true, configurable: true,
            value: function(file, directory){
                throw new Error("builder.build() must be implemented by the inheriting class")
            }
        }
      , BuildEvent: { enumerable: true,
            get: function(){ return builders.get(this).BuildEvent || module.exports.BuildEvent }
          , set: function(V){
                if ( module.exports.BuildEvent.isImplementedBy(V) && typeOf(V) == "function" )
                  builders.get(this).BuildEvent = V
            }
        }
      , ErrorEvent: { enumerable: true,
            get: function(){ return builders.get(this).ErrorEvent || module.exports.ErrorEvent }
          , set: function(V){
                if ( module.exports.ErrorEvent.isImplementedBy(V) && typeOf(V) == "function" )
                  builders.get(this).ErrorEvent = V
            }
        }
      , from: { enumerable: true,
            get: function(){ return path.join(this.root, builders.get(this).from) }
          , set: function(v){
                if ( typeOf(v) == "string" )
                  builders.get(this).from = v
            }
        }
      , handleCondition: { enumerable: true,
            get: function(){ return builders.get(this).handleCondition }
          , set: function(v){
                if ( typeOf(v) == "function" )
                    builders.get(this).handleCondition = v
            }
        }
      , handleEvent: { enumerable: true,
            value: function(e){
                console.log("foo")
                let rv
                if ( !Watcher.ChangeEvent.isImplementedBy(e) )
                  return

                try {
                  if ( this.handleCondition.call(this, e) )
                    rv = this.build.call( this, e.file, e.directory )

                  if ( rv && typeOf(rv.then) == "function" )
                    rv.then(function(){
                        this.dispatchEvent( new this.BuildEvent )
                    }.bind(this), function(err){
                        this.dispatchEvent( new this.ErrorEvent(err) )
                    }.bind(this))
                  else
                    this.dispatchEvent(new this.BuildEvent)
                } catch(err){
                  this.dispatchEvent(new this.ErrorEvent(err))
                }
            }
        }
      , root: { enumerable: true,
            get: function(){ return builders.get(this).root }
          , set: function(v){
                if ( typeOf(v) == "string" )
                  builders.get(this).root = v
            }
        }
      , to: { enumerable: true,
            get: function(){ return path.join(this.root, builders.get(this).to) }
          , set: function(v){
                if ( typeOf(v) == "string" )
                  builders.get(this).to = v
            }
        }
    }
})
