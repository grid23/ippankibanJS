"use strict"

const errors = require("./errors")
const eventWM = require("../lib/Event")._eventWM
const klass = require("../lib/class").class
const routeWM = require("../lib/Route")._routeWM
const typeOf = require("../lib/type").typeOf

const Event = require("../lib/Event").Event
const Node = require("../lib/Node").Node
const Route = require("../lib/Route").Route
const Router = require("../lib/Router").Router
const Server = require("./Server").Server
const WebSocketUpgrade = require("./WebSocketUpgrade").WebSocketUpgrade

const SignalResponse = klass(statics => {
    const responses = new WeakMap

    return {
        constructor: function(cmd, from, to, data){
            responses.set(this, Object.create(null))
            responses.get(this).replied = false
            responses.get(this).cmd = cmd
            responses.get(this).from = !!to ? from : null // if no target, target is emitter
            responses.get(this).to = to || from // if no target, target is emitter
            responses.get(this).data = data
        }
      , cmd: { enumerable: true,
            get: function(){ return responses.get(this).cmd }
          , set: function(v){ responses.get(this).cmd = cmd }
        }
      , data: { enumerable: true,
            get: function(){ return responses.get(this).data }
          , set: function(v){ responses.get(this).data = data }
        }
      , send: { enumerable: true,
            value: function(data){
                if ( !!responses.get(this).replied )
                  console.warn("a reply has already been sent")
                else
                  responses.get(this).replied = true

                const msg = {
                    cmd: this.cmd
                  , data: data || this.data
                }

                if ( responses.get(this).from )
                  msg["peer"] = responses.get(this).from

                return responses.get(this).to.frame_text(msg, { stringify: true })
            }
        }
    }
})

const CatchAllSocketCommand = klass(Route, statics => {
    const routes = routeWM

    return {
        constructor: function(upgrade, socket, cmd, peer, payload){
            const response = new SignalResponse(cmd, socket, peer, payload)
            Route.call(this, "catchall", { request:payload, response })
            routes.get(this).cmd = cmd
            routes.get(this).peer = peer
            routes.get(this).socket = socket
        }
      , cmd: { enumerable: true,
            get: function(){ return routes.get(this).cmd }
        }
      , peer: { enumerable: true,
            get: function(){ return routes.get(this).peer }
        }
      , socket: { enumerable: true,
            get: function(){ return routes.get(this).socket }
        }

    }
})

const SocketCommand = klass(Route, statics => {
    const routes = routeWM

    return {
        constructor: function(upgrade, socket, cmd, peer, payload){
            const response = new SignalResponse(cmd, socket, peer, payload)
            Route.call(this, cmd, { request:payload, response })
            routes.get(this).peer = peer
            routes.get(this).socket = socket
        }
      , cmd: { enumerable: true,
            get: function(){ return this.path }
        }
      , peer: { enumerable: true,
            get: function(){ return routes.get(this).peer }
        }
      , socket: { enumerable: true,
            get: function(){ return routes.get(this).socket }
        }

    }
})

const SignalEvent = module.exports.SignalEvent = klass(Event, statics => {
    const events = eventWM

    return {
        constructor: function(cmd, from, to, payload, response){
            Event.call(this, "signal")
            events.get(this).cmd = cmd
            events.get(this).from = from
            events.get(this).to = to
            events.get(this).payload = payload
            events.get(this).response = response
        }
      , cmd: { enumerable: true,
            get: function(){ return events.get(this).cmd }
        }
      , from: { enumerable: true,
            get: function(){ return events.get(this).from }
        }
      , payload: { enumerable: true,
            get: function(){ return events.get(this).payload }
        }
      , send: { enumerable: true,
            value: function(data){
                return events.get(this).response.send(data)
            }
        }
      , to: { enumerable: true,
            get: function(){ return events.get(this).to }
        }
    }
})

const AnswerEvent = klass(SignalEvent, statics => {
    const events = eventWM

    return {
        constructor: function(from, to, payload, response){
            SignalEvent.call(this, "answer", from, to, request, response)
        }
    }
})

const ErrorEvent = klass(SignalEvent, statics => {
    const events = eventWM

    return {
        constructor: function(from, to, payload, response){
            SignalEvent.call(this, "error", from, to, request, response)
        }
    }
})

const ICECandidateEvent = klass(SignalEvent, statics => {
    const events = eventWM

    return {
        constructor: function(from, to, payload, response){
            SignalEvent.call(this, "icecandidate", from, to, request, response)
        }
    }
})

const OfferEvent = klass(SignalEvent, statics => {
    const events = eventWM

    return {
        constructor: function(from, to, payload, response){
            SignalEvent.call(this, "offer", from, to, request, response)
        }
    }
})

module.exports.SignalingUpgrade = klass(Router, WebSocketUpgrade, statics => {
    const upgrades = new WeakMap

    return {
        constructor: function(server){
            WebSocketUpgrade.call(this, server)
            Router.call(this)

            upgrades.set(this, Object.create(null))
            upgrades.get(this).uuids = new Map

            this.addEventListener("socket", ({socket}) => {
                upgrades.get(this).uuids.set(socket.uid, socket) // maintain a list of socket by UID
                socket.addEventListener("close", e => upgrades.get(this).uuids.delete(socket.uid))

                socket.addEventListener("message", e => {
                    if ( e.op == "pong" )
                      return

                    e.preventDefault() //prevent derived events from firing

                    if ( e.op !== "text" )
                      return // ignore all but text frame

                    try {
                        let { cmd, data, peer } = JSON.parse( e.unmask() )

                        if ( !cmd )
                          throw new Error("no command")

                        if ( !!peer && this.uuids.indexOf(peer) != -1 )
                          peer = upgrades.get(this).uuids.get(peer)
                        else
                          peer = null

                        data = data || {}

                        this.dispatchRoute( new SocketCommand(this, socket, cmd, peer, data ) )
                          .addEventListener("routing", ({count}) => {
                              if ( !count )
                                this.dispatchRoute( new CatchAllSocketCommand(this, socket, cmd, peer, data))
                          })
                    } catch(e){
                        const cmd = "error"
                        const data = e.message

                        this.dispatchRoute( new SocketCommand(this, socket, cmd, data ) )
                    }
                })
            })

            this.addRouteHandler("answer", ({socket, peer, cmd, request, response}, next) => {
                const event = new AnswerEvent(socket, peer, request, response)
                this.dispatchEvent(event)
                if ( !event.cancelled )
                  response.send()
            })

            this.addEventListener("error", e => {
                console.warn(e.message)
                //prevent error from throwing
            }, true)
            this.addRouteHandler("error", ({socket, cmd, request, response}, next) => {
                const event = new ErrorEvent(socket, peer, request, response)
                this.dispatchEvent(event)
                if ( !event.cancelled )
                  response.send()
            })
            this.addRouteHandler("icecandidate", ({socket, peer, cmd, request, response}, next) => {
                const event = new ICECandidateEvent(socket, peer, request, response)
                this.dispatchEvent(event)
                if ( !event.cancelled )
                  response.send()
            })
            this.addRouteHandler("offer", ({socket, peer, cmd, request, response}, next) => {
                const event = new OfferEvent(socket, peer, request, response)
                this.dispatchEvent(event)
                if ( !event.cancelled )
                  response.send()
            })
            this.addRouteHandler("catchall", ({socket, peer, cmd, request, response}, next) => {
                const event = new SignalEvent(cmd, socket, peer, request, response)
                this.dispatchEvent(event)
            })
        }
      , uuids: { enumerable: true,
            get: function(){
                return [...upgrades.get(this).uuids.keys()]
            }
        }
    }
})
