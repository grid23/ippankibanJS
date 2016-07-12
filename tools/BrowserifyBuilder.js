"use strict"

const babelify = require("babelify")
const browserify = require("browserify")
const cssmodulesify = require('css-modulesify')
const cssnano = require("cssnano")
const defaults = require("./default_opts.json")
const envify = require("envify/custom")
const fs = require("fs")
const klass = require("../lib/class").class
const partialify = require("partialify/custom")
const path = require("path")
const typeOf = require("../lib/type").typeOf

const IBuilder = require("./IBuilder").IBuilder

module.exports.BrowserifyBuilder = klass(IBuilder, statics => {
    const builders = new WeakMap

    Object.defineProperties(statics, {
        BABELIFY_OPTS: { enumerable: true,
            get: function(){
                return defaults.babelify || {}
            }
        }
      , BROWSERIFY_OPTS: { enumerable: true,
            get: function(){
                return defaults.browserify || {}
            }
        }
      , PARTIALIFY_OPTS: { enumerable: true,
            get: function(){
                return defaults.partialify || {}
            }
        }
      , UGLIFY_OPTS: { enumerable: true,
            get: function(){
                return defaults.uglify || {}
            }
        }
      , CSS_MODULESIFY_OPTS: { enumerable: true,
            get: function(){
                return defaults["css-modulesify"] || {}
            }
        }
      , CSSNANO_OPTS: {
            get: function(){
                return defaults["cssnano"] || {}
            }
        }
    })

    return {
        constructor: function(...args){
            const handleCondition = typeOf(args[args.length-1]) == "function" ? args.pop() : null
            const dict = typeOf(args[0]) == "object" ? args.shift()
                       : typeOf(args[0]) == "string" ? { path: args.shift() }
                       : {}

            IBuilder.call(this, arguments)
            builders.set(this, Object.create(null))
        }
      , babelify: {
            get: function(){
                if ( !wm.get(this).babelify )
                  wm.get(this).babelify = JSON.parse(JSON.stringify(module.exports.BrowserifyBuilder.BABELIFY_OPTS))
                return wm.get(this).babelify
            }
        }
      , basedir: { enumerable: true,
            get: function(){
                if ( wm.get(this).basedir )
                  return path.join(this.root, wm.get(this).basedir)
                return process.cwd()
            }
          , set: function(v){
                if ( type(v) === "string" )
                  wm.get(this).basedir = v
            }

        }
      , browserify: { enumerable: true,
            get: function(){
                if ( !wm.get(this).browserify )
                  wm.get(this).browserify = JSON.parse(JSON.stringify(module.exports.BrowserifyBuilder.BROWSERIFY_OPTS))
                return wm.get(this).browserify
            }
        }
      , "css-modulesify": { enumerable: true,
            get: function(){
                if ( !wm.get(this)["css-modulesify"] )
                  wm.get(this)["css-modulesify"] = JSON.parse(JSON.stringify(module.exports.BrowserifyBuilder.CSS_MODULESIFY_OPTS))
                return wm.get(this)["css-modulesify"]
            }
        }
      , cssnano: { enumerable: true,
            get: function(){
                if ( !wm.get(this).cssnano )
                  wm.get(this).cssnano = JSON.parse(JSON.stringify(module.exports.BrowserifyBuilder.CSSNANO_OPTS))
                return wm.get(this).browserify
            }
        }
      , build: { enumerable: true,
            value: function(file, directory){
                return new Promise((resolve, reject) => {
                    resolve()
                })
            }
        }
      , debug: { enumerable: true,
            get: function(){ return !!wm.get(this).debug }
          , set: function(v){ wm.get(this).debug = !!v }
        }
      , partialify: { enumerable: true,
            get: function(){
                if ( !wm.get(this).partialify )
                  wm.get(this).partialify = JSON.parse(JSON.stringify(module.exports.BrowserifyBuilder.PARTIALIFY_OPTS))
                return wm.get(this).partialify
            }
        }
      , minify: { enumerable: true,
            get: function(){ return wm.get(this).minify }
          , set: function(v){ wm.get(this).minify = !!v }
        }
      , uglify: { enumerable: true,
            get: function(){
                if ( !wm.get(this).uglify )
                  wm.get(this).uglify = JSON.parse(JSON.stringify(module.exports.BrowserifyBuilder.UGLIFY_OPTS))
                return wm.get(this).uglify
            }
        }
    }
})
