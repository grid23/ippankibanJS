"use strict"

const ippan = require("../../../../../index")

const domready = ippan.domready
const klass = ippan.class
const singleton = ippan.singleton
const stylesheet = new ippan.Stylesheet

const CSSRule = ippan.CSSRule
const Collection = ippan.Collection
const EventTarget = ippan.EventTarget
const View = ippan.View

const main = ({nodes:{body}}) => {
    const ecol = new Collection
    const dataready = new Promise((resolve, reject) => {
        ecol.fetch({url: location.protocol+location.host+"/datasets/enron.json"})
        ecol.addEventListener("fetchcomplete", e => {
            ecol.list(["sender", "recipents"], (err, {sender:senders, recipients}) => {
                console.log(senders.length)
                resolve({senders, recipients})
            })
        })
    })

    const App = singleton(View, {
        constructor: function(){
            View.apply(this)

            this.query("anim").appendChild(new Anim().fragment)
            this.query("header").appendChild(new Selector().fragment)
            this.query("article").appendChild(new Content().fragment)
        }
      , template: "section>div@console>div@anim+header@header+article@article"
    })

    const Anim = klass(View, statics => {
        const wrapCSS = new CSSRule(".anim-wrap{ position:relative; height: 200px; }")
        const animCSS = new CSSRule(".anim{ position:absolute; margin-left:-50px; width: 100px; height: 100px; left:0; background:blue }")
        stylesheet.insertRule(wrapCSS)//, animCSS)

        return {
            constructor: function(){
                View.call(this)

                let pos = 0
                let dir = 1
                const setbackg = () => {
                    const iro = '#'+(function lol(m,s,c){return s[m.floor(m.random() * s.length)] + (c && lol(m,s,c-1));})(Math,'0123456789ABCDEF',4)
                    if ( dir > 0 && pos >= 100 ) {
                      dir = -1
                      return setTimeout(setbackg, 4)
                    }
                    else if ( dir < 0 && pos <= 0 ) {
                        dir = 1
                        return setTimeout(setbackg, 4)
                    }
                    pos = pos + dir

                    const width = this.query("wrap").clientWidth
                    const x = Math.max( Math.min(width-50, ( width * pos) / 100), 50)
                    //animCSS.setProperty("background", iro)

                    animCSS.setProperty("transform", `translate3d(${x}px, 0, 0)`)
                    this.query("anim").style.cssText = animCSS.cssText
                    requestAnimationFrame(setbackg)
                }

                requestAnimationFrame(setbackg)
            }
          , template: "div@wrap.anim-wrap > span@anim.anim"
        }
    })

    const Selector = klass(View, {
        constructor: function(){
            View.call(this, this)

            this.query("form").addEventListener("submit", e => {
                e.preventDefault()

                const data = {}
                Array.prototype.slice.call(this.query("form").elements)
                  .forEach(node => {
                      if ( !!node.name && !!node.value )
                        data[node.name] = node.value
                  })

                if ( !!data.sender )
                  this.broadcastEvent("selection", data)

            })

            dataready.then(({senders, recipients})=>{
                const append = () => {
                    senders = senders.slice() //copy

                    return new Promise((resolve, reject) => {
                        const fragment = document.createDocumentFragment()

                        const exec = () => {
                            let split = senders.splice(0, Math.min(10, senders.length))

                            setTimeout(()=> {
                                  split.forEach(sender => {
                                      fragment.appendChild(new Option(sender).fragment)
                                  })

                                  if ( senders.length )
                                    exec()
                                  else
                                    this.query("select").appendChild(fragment),
                                    resolve()
                            }, 4)
                        }
                        exec()
                    })
                }

                const onbusy = () => {
                    this.query("button").setAttribute("disabled", true)
                    this.query("select").setAttribute("disabled", true)
                }
                const onidle = () => {
                    this.query("button").removeAttribute("disabled")
                    this.query("select").removeAttribute("disabled")
                }

                EventTarget.addBroadcastEventListener("busy", onbusy)
                EventTarget.addBroadcastEventListener("idle", onidle)
                append().then(onidle)
            })
        }
      , template: "form@form > (select@select[name=sender][disabled] > option{choose a sender}) + button[type=submit][disabled]{show mails}"
    })

    const Option = klass(View, {
        constructor: function(sender){
            View.call(this)
            this.model.write("sender", sender)
        }
      , template: "option[value=$sender]{$sender}"
    })

    const Content = klass(View, {
        constructor: function(){
            View.call(this)

            EventTarget.addBroadcastEventListener("selection", ({detail:{sender}})=> {
                console.log("getting mails from", sender)

                dataready.then(({senders}) => {
                    this.broadcastEvent("busy")

                    const subset = ecol.subset({ sender })
                    subset.addEventListener("subsetready", e => {
                        const mails = subset.models.slice()

                        return new Promise((resolve, reject) => {
                            const fragment = document.createDocumentFragment()

                            const exec = () => {
                                let split = mails.splice(0, Math.min(10, mails.length))

                                setTimeout(()=> {
                                      split.forEach(mail => {
                                          fragment.appendChild(new Mail(mail).fragment)
                                      })

                                      if ( mails.length )
                                        exec()
                                      else {
                                          this.query("root").innerHTML = ""
                                          this.query("root").appendChild(fragment)
                                          this.broadcastEvent("idle")
                                          resolve()
                                      }

                                }, 4)
                            }
                            exec()
                        })
                    })
                })
            })
        }
      , template: "ul{}"
    })

    const Mail = klass(View, statics => {
        const subjectCSS = new CSSRule(".msubject{}")
        const dateCSS = new CSSRule(".mdate{ display: block; color: grey;}")
        const recCSS = new CSSRule(".mrec{ display: block; text-style:italic;}")
        const textCSS = new CSSRule(".mrec{}")
        stylesheet.insertRule(subjectCSS, dateCSS, recCSS, textCSS)

        return {
            constructor: function(){
                View.apply(this, arguments)

                this.model.read("recipients", (err, data) => {
                    const recipients = data.recipients || []

                    this.model.write("recipients_normalized", recipients.join(", "))
                })
            }
          , template: "li > (hgroup > h1.msubject#$_id{$subject} + span.mdate{$date} + span.mrec{$recipients_normalized}) + p.mtext{$text}"
        }
    })

    body.appendChild(new App().fragment)
}

domready
  .then(main)
