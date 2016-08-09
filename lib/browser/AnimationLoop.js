"use strict"

const errors = require("../errors")
const performance = require("../performance")
const singleton = require("../class").singleton
const typeOf = require("../type").typeOf

const Event = require("../Event").Event
const EventTarget = require("../EventTarget").EventTarget

module.exports.AnimationLoop = singleton(EventTarget, statics => {
    const cancelAnimationFrame = window.cancelAnimationFrame
    const isGenerator = fn => typeof fn == "function" && fn.constructor !== Function
    const isIterator = fn => typeOf(fn) === "generator"
    const queue = new Set()
    const requestAnimationFrame = window.requestAnimationFrame

    let F_LENGTH = 16
    let MIN_F_LENGTH = 30
    let CUR_F_LENGTH = F_LENGTH

    Object.defineProperties(statics, {
        IDLE: { enumerable: true, value: 0 }
      , BUSY: { enumerable: true, value: 1 }

      , setFPS: { enumerable: true,
            value: function(f){
                if ( typeOf(f) !== "number" )
                  return

                F_LENGTH = 1000 / math.abs(f)
                MIN_F_LENGTH = F_LENGTH *2
            }
        }
    })

    let readyState = statics.IDLE

    return {
        constructor: function(){
            const onend = e => {}
            const onframe = hrt => {
                const frame = [...queue][0]
                let remain = []

                if ( frame )
                  queue.delete(frame)

                const handlers = [...frame.entries()]
                                 .sort((a, b)=> ( (a[1].tries||0) + (+a[1].priority*2) ) - ( (b[1].tries||0) + (+b[1].priority*2) ) )

                let elapsed
                while ( elapsed = performance.now() - hrt, elapsed < CUR_F_LENGTH && !!handlers.length ) {
                    let [handler, {priority, tries}] = handlers.shift()

                    if ( isGenerator(handler) )
                      handler = handler()

                    if ( isIterator(handler) ) {
                        const done = handler.next().done
                        if ( !done )
                          remain.push([handler, {priority, tries:-1}])
                    } else handler(hrt)
                }

                if ( handlers.length )
                  CUR_F_LENGTH = CUR_F_LENGTH+2 // TODO : Math.min(CUR_F_LENGTH+2, MIN_F_LENGTH) // what if the browser is unable to run at even 30fps (ie, slow devices), what can we do with performance object?
                else
                  CUR_F_LENGTH = F_LENGTH

                if ( remain = remain.concat(handlers), remain.length ) {
                    let nextFrame
                    if ( queue.size )
                      nextFrame = [...queue][0]
                    else {
                        nextFrame = new Map
                        queue.add(nextFrame)
                    }

                    remain.forEach(([handler, {priority, tries}]) => nextFrame.set(handler, {priority, tries: (tries||0)+1 }))
                }

                if ( queue.size )
                  requestAnimationFrame(onframe)
                else
                  this.end()
            }
            const onstart = e => requestAnimationFrame(onframe)
            this.addEventListener("start", onstart, true)
            this.addEventListener("end", onend, true)
        }
      , cancelAnimationFrame: { enumerable: true,
            value: function(fn){
                if ( !queue.size )
                  return
                const frame = [...queue][0]

                if ( frame.has(fn) )
                  frame.delete(fn)
            }
        }
      , end: { enumerable: true,
            value: function(){
                if ( !!queue.size || readyState === module.exports.AnimationLoop.IDLE )
                  return

                readyState = module.exports.AnimationLoop.IDLE
                this.dispatchEvent("end", { cancelable: false })
            }
        }
      , readyState: { enumerable: true,
            get: function(){ return readyState }
        }
      , requestAnimationFrame: { enumerable: true,
            value: function(fn, priority=false){
                if ( typeof fn !== "function" && !!isIterator(fn) ) {
                    if ( typeOf(fn) == "array" )
                      return this.requestAnimationFrames(fn, priority)
                    throw new Error(errors.NOT_CALLABLE)
                }
                priority = !!priority

                let frame
                if ( queue.size )
                  frame = [...queue][0]
                else
                    frame = new Map,
                    queue.add(frame)

                frame.set(fn, {priority})

                this.start()
            }
        }
      , requestAnimationFrames: { enumerable: true,
            value: function(fns, priority=false) {
                const frames = [...queue]
                fns = typeOf(fns == "array" ) || []
                priority = !!priority

                fns.forEach((fn, i) => {
                    if ( typeof fn !== "function" && !!isIterator(fn) ) {
                        if ( typeOf(fn) !== "undefined" )
                          throw new Error(errors.NOT_CALLABLE)
                    }

                    let frame
                    if ( !frames[i] ) {
                        frame = new Map
                        queue.add(frame)
                    } else frame = frames[i]

                    if ( fn )
                      frame.set(fn, {priority})
                })

                this.start()
            }
        }
      , start: { enumerable: true,
            value: function(){
                if ( readyState === module.exports.AnimationLoop.BUSY || !queue.size )
                  return

                readyState = module.exports.AnimationLoop.BUSY
                this.dispatchEvent("start", { cancelable: false })
            }
        }
    }
})
