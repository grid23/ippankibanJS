"use strict"

const klass = require("../class").class
const typeOf = require("../type").typeOf

const Event = require("../Event").Event
const Model = require("../Model").Model
const UpdateEvt = require("../Model").UpdateEvt

module.exports.CookieSyncEvt = klass(Event, statics => {
    Object.defineProperties(statics, {
        PATH: { enumerable: true,
            value: "cookiesync"
        }
    })

    return {
      constructor: function(){
          Event.call(this, module.exports.CookieSyncEvt.PATH)
      }
    }
})

module.exports.Cookie = klass(Model, statics => {
    const cookies = new WeakMap
    const LIFESPAN = 15552000000

    Object.defineProperties(statics, {
        COOKIE_ENABLED: { enumerable: true,
            value: !!navigator.cookieEnabled
        }
      , TOP_DOMAIN: { enumerable: true,
            value: function(){
                const cookiestr = "__itestcookie=testcookie"
                const cookie = domain => {
                    document.cookie = cookiestr+"; domain="+domain

                    if ( document.cookie.indexOf(cookiestr) != -1 ) {
                        document.cookie = cookiestr+"; domain="+domain+"; expires=" + new Date( +(new Date) - 1000 ).toUTCString()
                        return true
                    }

                    return false
                }

                const split = location.hostname.split(".")

                let curr = ""
                let i = split.length
                let hit = false

                while (i--)
                  if ( curr == split.slice(i).join("."), hit = cookie(curr), hit )
                    return curr

            }()
        }
    })

    return {
        constructor: function(...args){
            const dict = typeOf(args[0]) == "string" ? { name: args.shift() }
                       : typeOf(args[0]) == "object" && typeOf(args[0].name) == "string" ? args.shift()
                       : { name: "__noname" }

            Model.apply(this, args)

            cookies.set(this, new Map)
            cookies.get(this).set("domain", typeOf(dict.domain) == "string" ? dict.domain : module.exports.Cookie.TOP_DOMAIN)
            cookies.get(this).set("expires", !!dict.session ? ""
                                                            : !isNaN( +(new Date(dict.expires)) ) ? new Date(dict.expires).toUTCString()
                                                            : new Date( +(new Date) + (+dict.maxAge||LIFESPAN) ).toUTCString())
            cookies.get(this).set("name", dict.name)
            cookies.get(this).set("path", typeOf(dict.path) == "string" ? dict.path : "/")
            cookies.get(this).set("session", !!dict.session)

            const read = ()=>{
                //TODO ?
            }
            window.addEventListener("focus", read)

            this.addEventListener(UpdateEvt.NAME, e => {
                if ( e.target === this )
                  this.sync()
            }, true)
        }
      , clear: { enumerable: true,
            value: function(){}
        }
      , COOKIE_ENABLED: { enumerable: true,
            get: function(){ return module.exports.Cookie.COOKIE_ENABLED }
        }
      , domain: { enumerable: true,
            get: function(){ return cookies.get(this).get("domain") }
        }
      , expires: { enumerable: true,
            get: function(){ return cookies.get(this).get("expires") }
        }
      , TOP_DOMAIN: { enumerable: true,
            get: function(){ return module.exports.Cookie.TOP_DOMAIN }
        }
      , name: { enumerable: true,
            get: function(){ return cookies.get(this).get("name") }
        }
      , path: { enumerable: true,
            get: function(){ return cookies.get(this).get("path") }
        }
      , session: { enumerable: true,
            get: function(){ return cookies.get(this).get("session") }
        }
      , sync: { enumerable: true,
            value: function(){
                return this.read("*", (err, data) => {
                    const str = escape(JSON.stringify(data))

                    if ( str.length )
                      document.cookie = [this.name, "=", str, "; domain=", this.domain, "; path=", this.path, ";", this.session?"":"expires="+this.expires+";"].join("")
                    else
                      document.cookie = [this.name, "=0; domain=", this.domain, "; path=", this.path, "; expires=", new Date( +(new Date) - 1000 ).toUTCString(), ";"].join("")

                    this.dispatchEvent(new module.exports.CookieSyncEvt)
                })
            }
        }
    }
})
