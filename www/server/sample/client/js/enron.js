"use strict"

const ippan = require("../../../../../index")

const domready = ippan.domready
const klass = ippan.class
const singleton = ippan.singleton
const stylesheet = new ippan.Stylesheet

const CSSRule = ippan.CSSRule
const Collection = ippan.Collection
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
        }
      , template: "section>div@console>div@anim+header@header+article@article"
    })

    const Anim = klass(View, statics => {
        const wrapCSS = new CSSRule(".anim-wrap{ position:relative; height: 200px; }")
        const animCSS = new CSSRule(".anim{ position:absolute; margin-left:-50px; width: 100px; height: 100px; left:0; background:blue }")
        stylesheet.insertRule(wrapCSS, animCSS)

        return {
            constructor: function(){
                View.call(this)

                let pos = 0
                let dir = 1
                const setbackg = () => {
                    const iro = '#'+(function lol(m,s,c){return s[m.floor(m.random() * s.length)] + (c && lol(m,s,c-1));})(Math,'0123456789ABCDEF',4)
                    if ( dir > 0 && pos >= 100 )
                      dir = -1
                    else if ( dir < 0 && pos <= 0 )
                      dir = 1
                    pos = pos + dir

                    const width = this.query("wrap").clientWidth
                    const x = Math.max( Math.min(width-50, ( width * pos) / 100), 50)
                    //animCSS.setProperty("background", iro)

                    animCSS.setProperty("transform", `translate3d(${x}px, 0, 0)`)
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
                console.log(e)
            })

            dataready.then(({senders, recipients})=>{
                const append = () => {
                    return new Promise((resolve, reject) => {
                        const exec = () => {
                            let split = senders.splice(0, Math.min(5, senders.length))

                            requestAnimationFrame(()=> {
                                  split.forEach(sender => {
                                      this.query("select").appendChild(new Option(sender).fragment)
                                  })

                                  if ( senders.length )
                                    exec()
                                  else
                                    resolve()
                            })
                        }
                        exec()
                    })
                }

                append().then(()=>{
                    this.query("button").removeAttribute("disabled")
                })
            })
        }
      , template: "form@form > (select@select > option{choose a sender}) + button[type=submit][disabled]{show mails}"
    })

    const Option = klass(View, {
        constructor: function(sender){
            View.call(this)
            this.model.write("sender", sender)
        }
      , template: "option[value=$sender]{$sender}"
    })

    body.appendChild(new App().fragment)
}

domready
  .then(main)
