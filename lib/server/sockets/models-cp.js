"use strict"

const { DEBUG, VERBOSE } = require("../../env")

const ios = new Map
const models = new Map
const net = require("net")
let ready = Promise.resolve()

function IO(input, output, is_node){
    ios.set(this, Object.create(null))
    ios.get(this).chain = input.chain
    ios.get(this).cmd = input.cmd
    ios.get(this).data = input.data
    ios.get(this).meta = input.meta
    ios.get(this).output = output
    ios.get(this).uid = input.chain[0]
    ios.get(this).is_node = is_node
    this[this.cmd]()
}

IO.CMD = ["find", "list", "read", "sort", "trace", "write"]

IO.writeKeyValuePairs = function(){
    const recursiveRemove = (map, model, path) => {
        let value = [...model.get(path)][0].value

        if ( (!!value && value.constructor === Object) || (!!value && Array.isArray(value)) ) {
            for ( let k in value )
              recursiveRemove(map, model, path+"."+k)
        } else {
            map.set(path, undefined)
        }
    }

    const exec = (o, map, model, path) => {
        for ( let k in o ) {
            let npath = path ? path+"."+k : k

            if ( (!!o[k] && o[k].constructor === Object) || (!!o[k] && Array.isArray(o[k])) ) {
                if ( model.has(npath) )
                  recursiveRemove(map, model, npath)

                map.set(npath, o[k])
                exec(o[k], map, model, npath)
            } else
              map.set(npath, o[k])

            let hierarchy = npath.split(".")
            if ( hierarchy.length > 1 ) {
                let parentPath = hierarchy.splice(0, hierarchy.length-1).join(".")
                let currentPath = hierarchy[hierarchy.length-1]

                if ( model.has(parentPath)  ) {
                    let parentValue = [...model.get(parentPath)][0].value
                    let currentValue = map.has(parentPath) ? map.get(parentPath) : null

                    if ( !currentValue ) {
                        if ( !!parentValue && parentValue.constructor === Object ) {
                            let newValue = {}

                            for ( let l in parentValue )
                              newValue[l] = l === currentPath ? o[k] : parentValue[l]

                            map.set(parentPath, newValue)
                        } else if ( !!parentValue && Array.isArray(parentValue)) {
                            let newValue = [].concat(parentValue)

                            newValue[currentPath] = o[k]
                            map.set(parentPath, newValue)
                        }
                    } else {
                        currentValue = o[k]
                    }
                }
            }

        }
    }

    return (data, model) => {
        const map = new Map

        if ( (!!data && data.constructor == Object) || (!!data && Array.isArray(data)) )
          exec(data, map, model)
        else
          throw new TypeError() //TODO

        return map
    }
}()

IO.prototype = Object.create(null, {
    chain: { enumerable: true,
        get: function(){ return ios.get(this).chain }
    }
  , cmd: { enumerable: true,
        get: function(){
            return IO.CMD.indexOf(ios.get(this).cmd) != -1
                 ? ios.get(this).cmd
                 : "nocmd" }
    }
  , data: { enumerable: true,
        get: function(){ return ios.get(this).data }
    }
  , find: { enumerable: true,
        value: function(full){
            const conditions = []
            const hits = []

            Object.keys(this.data).forEach(key => {
                conditions.push([key, Function.apply(this, this.data[key])])
            })

            const l = conditions.length

            this.chain.forEach(uid => {
                const model = models.get(uid)
                let hit = !!model

                conditions.forEach(([key, handler]) => {
                    if ( !hit || !model.has(key) ) {
                        hit = false
                        return
                    }

                    const value = [...model.get(key)]
                                .reduceRight(function(p, c){
                                    if ( !full && !p )
                                      return c.value
                                    else if ( !!full )
                                      return (p.push(c), p)
                                    else
                                      return p
                                }, full?[]:null)

                    if ( !full )
                      hit = handler(value)
                })

                if ( !!hit )
                  hits.push(uid)
            })

            this.reply({
                error: null
              , models: hits
            })
        }
    }
  , list: { enumerable: true,
        value: function(full){
            const lists = {}
            const iterator = (Array.isArray(this.data) ? this.data.filter( v => typeof v == "string" )
                         : this.data === "*" ? [...this.map].map(([key]) => key)
                         : typeof this.data == "string" ? [this.data]
                         : [])[Symbol.iterator]()
            let iteration, current

            while ( iteration = iterator.next(), current = iteration.value, !iteration.done ) {
                const set = new Set

                this.chain.forEach(uid => {
                    const model = models.get(uid)

                    if ( model && model.has(current) )
                      set.add([...model.get(current)]
                        .reduceRight((p, c) => {
                            if ( !full && !p )
                              return c.value
                            else if ( !!full )
                              return (p.push(c), p)
                            else
                              return p
                        }, full?[]:null))
                })

                lists[current] = [...set]
            }

            this.reply({
                error: null
              , lists
            })
        }
    }
  , map: { enumerable: true,
        get: function(){
            return models.has(this.uid) ? models.get(this.uid) : (models.set(this.uid, new Map), models.get(this.uid))
        }
    }
  , mapTree: { enumerable: true,
        get: function(){
            return this.chain.map( uid => models.has(uid) ? models.get(uid) : (models.set(uid, new Map), models.get(uid)))
        }
    }
  , meta: { enumerable: true,
        get: function(){ return ios.get(this).meta }
    }
  , nocmd: { enumerable: true,
        value: function(){
            this.reply({
                error: true
              , message: "no command"
            })
        }
    }
  , output: { enumerable: true,
        get: function(){ return ios.get(this).output }
    }
  , read: { enumerable: true,
        value: function(full){
            let data = {}
            let iterator = (Array.isArray(this.data) ? this.data.filter( v => typeof v == "string" )
                         : this.data === "*" ? [...this.map].map(([key]) => key)
                         : typeof this.data == "string" ? [this.data]
                         : [])[Symbol.iterator]()
            let tree = this.mapTree // full ? this.mapTree : [this.map]

            let iteration, current
            while ( iteration = iterator.next(), current = iteration.value, !iteration.done ) {
                tree.forEach(map => {
                  let value

                  if ( map.has(current) )
                    value = [...map.get(current)]
                      .reduceRight(function(p, c){
                          if ( !full && !p )
                            return c.value
                          else if ( !!full )
                            return (p.push(c), p)
                          else
                            return p
                      }, full?[]:null)

                  if ( full && typeof value !== "undefined" && !!data.hasOwnProperty(current) )
                    data[current] = data[current].concat(value)
                  else
                    if ( typeof value !== "undefined" && !data.hasOwnProperty(current) )
                      data[current] = value
                })
            }

            this.reply({
                error: null
              , data
            })
        }
    }
  , reply: { enumerable: true,
        value: function(msg){
            ready = ready.then(() => {
                return new Promise((resolve, reject) => {
                    const socket = new net.Socket
                    let ended = false

                    const onerror = e => {
                      if ( VERBOSE )
                        console.log(`[${__filename}, ${this.output}] ERROR)`, e.stack)
                      reject(e)
                    }

                    const onclose = e => {
                        if ( DEBUG )
                          console.log(`[${__filename}, ${this.output}] CLOSE`)
                        onend(e, true)
                    }

                    const onend = (e, fallback) => {
                      if ( ended )
                        return
                      ended = true

                      if ( DEBUG )
                        console.log(`[${__filename}, ${this.output}] END ( fallback? ${!!fallback})`)

                      socket.removeListener("close", onclose)
                      socket.removeListener("error", e => onerror)
                      socket.removeListener("end", e => onend)
                      resolve(e)
                    }

                    const onconnect = e => {
                        if ( DEBUG )
                          console.log(`[${__filename}, ${this.output}] CONNECT`)

                        socket.removeListener("connect", onconnect)
                        socket.write( JSON.stringify(msg), () => {
                            if ( DEBUG )
                              console.log(`[${__filename}, ${this.output}] DATA WRITTEN`)
                            socket.end()

                            setTimeout(() => {
                                socket.unref()
                                socket.destroy()
                            }, 4)
                        })
                    }

                    socket.addListener("close", onclose)
                    socket.addListener("error", e => onerror)
                    socket.addListener("end", e => onend)
                    socket.addListener("connect", onconnect)
                    socket.connect(this.output)
                })
            })
        }
    }
  , sort: { enumerable: true,
        value: function(){
            const keys = this.data.keys
            const handler = Function.apply(this, this.data.handler)
            const unsorted = this.chain
            const sorted = unsorted.sort((x, y) => {
                const a = {}
                const b = {}

                keys.forEach(key => {
                    a[key] = [...models.get(x).get(key)].reduceRight((p, c) => {
                        if ( !p ) return c.value
                        return p
                    }, null)

                    b[key] = [...models.get(y).get(key)].reduceRight((p, c) => {
                        if ( !p ) return c.value
                        return p
                    }, null)
                })
                return handler(a, b)
            })

            this.reply({
                error: null
              , models: sorted
            })
        }
    }
  , trace: { enumerable: true,
        value: function(){
            return this.read(true)
        }
    }
  , uid: { enumerable: true,
        get: function(){ return ios.get(this).uid }
    }
  , write: { enumerable: true,
        value: function(){
            if ( DEBUG )
                console.log(`[${__filename}, IO.write()]`, this.data, this.map)
            let iterator = IO.writeKeyValuePairs(this.data, this.map)[Symbol.iterator]()
            let updated_keys = []
            let added_keys = []
            let deleted_keys = []

            let iteration, current

            while ( iteration = iterator.next(), current = iteration.value, !iteration.done ) {
                if ( typeof current[1] != "undefined" && current[1] !== "__undefined" ) {
                  if ( !this.map.has(current[0]) )
                    added_keys.push(current[0]),
                    this.map.set(current[0], new Set)
                } else {
                  if ( this.map.has(current[0]) )
                    deleted_keys.push(current[0])
                }

                updated_keys.push(current[0])
                this.map.get(current[0]).add({ value: current[1], meta: this.meta })
            }

            this.reply({
                error: null
              , add: added_keys
              , remove: deleted_keys
              , update: updated_keys
            })
        }
    }
})

process.on("message", (e, server) => {
    if ( DEBUG )
      console.log(`[${__filename}, process.on("message")]`, e.data)

    new IO(e.data, e.ports[0])
})

const onsignal = e => process.exit()
process.on("SIGINT", onsignal)
process.on("SIGTERM", onsignal)

process.send("ippankiban-models-cp--ready")
