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
const uglify = require("uglify-js")

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

            IBuilder.call(this, dict, handleCondition)
            builders.set(this, Object.create(null))
            this.to_css = dict.to_css
            this.minify = dict.minify
        }
      , babelify: {
            get: function(){
                if ( !builders.get(this).babelify )
                  builders.get(this).babelify = JSON.parse(JSON.stringify(module.exports.BrowserifyBuilder.BABELIFY_OPTS))
                return builders.get(this).babelify
            }
        }
      , basedir: { enumerable: true,
            get: function(){ return path.join(this.root, this.browserify.basedir) }
          , set: function(v){
                if ( typeOf(v) === "string" )
                  this.browserify.basedir = v
            }

        }
      , browserify: { enumerable: true,
            get: function(){
                if ( !builders.get(this).browserify )
                  builders.get(this).browserify = JSON.parse(JSON.stringify(module.exports.BrowserifyBuilder.BROWSERIFY_OPTS))
                return builders.get(this).browserify
            }
        }
      , "css-modulesify": { enumerable: true,
            get: function(){
                if ( !builders.get(this)["css-modulesify"] )
                  builders.get(this)["css-modulesify"] = JSON.parse(JSON.stringify(module.exports.BrowserifyBuilder.CSS_MODULESIFY_OPTS))
                return builders.get(this)["css-modulesify"]
            }
        }
      , cssnano: { enumerable: true,
            get: function(){
                if ( !builders.get(this).cssnano )
                  builders.get(this).cssnano = JSON.parse(JSON.stringify(module.exports.BrowserifyBuilder.CSSNANO_OPTS))
                return builders.get(this).browserify
            }
        }
      , build: { enumerable: true,
            value: function(file, directory){
                const onexception = e => {
                    process.removeListener("uncaughtException", onexception)

                    if ( e._babel )
                      console.log(`${e.filename}, ${e.pos}\n${e.codeFrame}`)
                    else
                      console.error(e)
                }
                process.addListener("uncaughtException", onexception)

                this.browserify.basedir = this.browserify.basedir || this.root
                this["css-modulesify"].rootDir = this["css-modulesify"].rootDir || this.root
                this["css-modulesify"].output = this["css-modulesify"].output || this.to_css

                return new Promise((resolve, reject) => {
                    const bundle = browserify(this.from, this.browserify)
                    bundle.external(this.externals)

                    bundle
                      .transform(babelify, this.babelify)
                      .transform( partialify.alsoAllow(this.partialify.alsoAllow) )
                      .transform(envify({ NODE_ENV: process.env.NODE_ENV || "development" }))

                    if ( this.expose )
                      bundle.require(this.from, { expose: this.expose })

                    bundle.plugin(cssmodulesify, this["css-modulesify"])

                    if ( !this.minify )
                      Promise.all([
                          new Promise((resolve, reject) => {
                              bundle.on("bundle", stream => {
                                  const op = stream.pipe(fs.createWriteStream(this.to))

                                  op.on("error", e => reject(e))
                                  op.on("finish", resolve)
                              })
                          })
                        , new Promise((resolve, reject) => {
                              bundle.on("css stream", stream => {
                                  const op = stream.pipe(fs.createWriteStream(this["css-modulesify"].output))
                                  op.on("error", e => reject(e))
                                  op.on("finish", resolve)
                              })
                          })
                      ])
                      .then(() => {
                          this.dispatchEvent("built")
                          resolve()
                      })
                    else if ( this.minify )
                      Promise.all([
                          new Promise((resolve, reject) => {
                              bundle.on("bundle", stream => {
                                  const chunks = []
                                  const compressor = uglify.Compressor(this.uglify.compressor)

                                  stream.on("data", buffer => chunks.push(buffer))
                                  stream.on("end", () => {
                                      let ast, output
                                      const buffer = Buffer.concat(chunks).toString()

                                      ast = uglify.parse(buffer)
                                      ast.figure_out_scope()
                                      ast.transform(compressor)
                                      ast.figure_out_scope()

                                      output = uglify.OutputStream(this.uglify.outputStream)
                                      ast.print(output)

                                      fs.writeFile(this.to, output.toString(), "utf8", error => {
                                          if ( error ) {
                                              this.dispatchEvent("error", error)
                                              reject(error)
                                          }

                                          resolve()
                                      })
                                  })
                              })
                          })
                        , new Promise((resolve, reject) => {
                              bundle.on("css stream", stream => {
                                  const chunks = []

                                  stream.on("data", buffer => chunks.push(buffer))
                                  stream.on("end", () => {
                                      const buffer = Buffer.concat(chunks).toString()

                                      cssnano.process(buffer, this.cssnano).then(result => {
                                          fs.writeFile(this.to, result.css, "utf8", error => {
                                              if ( error ) {
                                                  reject(error)
                                              }

                                              resolve()
                                          })
                                      })
                                  })
                              })
                          })
                      ])
                      .then(() => {
                          process.removeListener("uncaughtException", onexception)
                          this.dispatchEvent("built")
                          resolve()
                      })

                    bundle.bundle()
                    bundle.on("error", error => {
                        reject(error)
                    })
                })
                .catch(e => {
                    this.dispatchEvent("error", e)
                })
            }
        }
      , debug: { enumerable: true,
            get: function(){ return this.browserify.debug }
          , set: function(v){ this.browserify.debug = !!v }
        }
      , expose: { enumerable: true,
            get: function(){ return builders.get(this).expose }
          , set: function(v){
                if ( typeOf(v) === "string" )
                  builders.get(this).expose = v
            }
        }
      , externals: { enumerable: true,
            get: function(){ return builders.get(this).externals || []
            }
          , set: function(v){
                v = typeOf(v) == "string" ? [v]
                  : typeOf(v) == "array" ? [].concat(v)
                  : []

                builders.get(this).externals = v
            }
        }
      , externalRequireName: { enumerable: true,
            get: function(){ return this.browserify.externalRequireName }
          , set: function(){
                if ( typeOf(v) === "string" )
                  this.browserify.externalRequireName = v
            }
        }
      , partialify: { enumerable: true,
            get: function(){
                if ( !builders.get(this).partialify )
                  builders.get(this).partialify = JSON.parse(JSON.stringify(module.exports.BrowserifyBuilder.PARTIALIFY_OPTS))
                return builders.get(this).partialify
            }
        }
      , minify: { enumerable: true,
            get: function(){ return builders.get(this).minify }
          , set: function(v){ builders.get(this).minify = !!v }
        }
      , to_js: { enumerable: true,
            get: function(){ return this.to }
        }
      , to_css: { enumerable: true,
            get: function(){
                if ( builders.get(this).to_css )
                  return path.join(this.root, builders.get(this).to_css)
                return this.to.replace(path.extname(this.to), ".css")
            }
          , set: function(v){
                if ( typeOf(v) == "string" )
                  builders.get(this).to_css = v
            }
        }
      , uglify: { enumerable: true,
            get: function(){
                if ( !builders.get(this).uglify )
                  builders.get(this).uglify = JSON.parse(JSON.stringify(module.exports.BrowserifyBuilder.UGLIFY_OPTS))
                return builders.get(this).uglify
            }
        }
    }
})
