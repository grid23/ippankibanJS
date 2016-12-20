"use strict"

const ippan = require("../../../../../index")

const domready = ippan.domready
const klass = ippan.class
const requestAnimationFrame = ippan.requestAnimationFrame
const singleton = ippan.singleton
const stylesheet = new ippan.Stylesheet

const CSSRule = ippan.CSSRule
const Collection = ippan.Collection
const EventTarget = ippan.EventTarget
const Model = ippan.Model
const Service = ippan.Service
const View = ippan.View

const Store = klass(Collection, statics => {
    const stores = new WeakMap

    const adjectives = ["pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint", "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly", "adorable", "important", "inexpensive", "cheap", "expensive", "fancy"];
    const colours = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"];
    const nouns = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger", "pizza", "mouse", "keyboard"];
    const random = max => Math.round(Math.random()*1000)%max

    return {
        constructor: function(){
            Collection.apply(this, arguments)
            stores.set(this, Object.create(null))
            stores.get(this).id = 0
        }
      , id: { enumerable: true,
            get: function(){ return stores.get(this).id }
          , set: function(v){ stores.get(this).id = v }
        }
      , buildData: { enumerable: true,
            value: function(count = 1000){
                const ops = []

                for ( let i = 0; i < count; i += 1 )
                  this.addModel(new Item({
                      id: this.id++
                    , label: adjectives[random(adjectives.length)] + " " + colours[random(colours.length)] + " " + nouns[random(nouns.length)]
                  }))
            }
        }
    }
})

const Item = klass(Model, statics => {
    const item = new WeakMap

    return {
        constructor: function(){
            Model.apply(this, arguments)
        }
    }
})

const Row = klass(View, statics => {

    return {
        constructor: function(model){
            View.call(this, model)
        }
      , template: "tr#$id{$label}"
    }
})

const Table = klass(View, statics => {
    const tables = new WeakMap

    return {
        constructor: function(){
            const store = new Store

            View.call(this)
            tables.set(this, Object.create(null))

            EventTarget.addBroadcastEventListener("run", e => {
                const start = performance.now()

                store.buildData()

                const ops = []
                const fragment = document.createDocumentFragment()
                store.models.forEach((model, i) => {
                     let sub = new Row(model)
                     fragment.appendChild(sub.fragment)

                     ops.push( new Promise((resolve, reject) => {
                          sub.addEventListener("ready", resolve)
                     }))
                })

                Promise.all(ops).then(() => {
                    this.node.tbody.appendChild(fragment)
                    console.log("dom + data", performance.now() - start)
                })
            })
        }
      , template: "table.table.table-hover.table-striped.test-data>tbody#tbody@tbody"
    }
})

const App = klass(View, statics => {
    const apps = new WeakMap

    return {
        constructor: function(){
            View.call(this)

            this.nodes.btn.forEach(btn => {
                btn.addEventListener("click", e => {
                    if ( !this[btn.id] )
                      return
                    e.preventDefault()
                    this[btn.id]()
                })
            })

            this.node.container.appendChild(new Table().fragment)
        }
      , template: `#main > .container@container > .jumbotron > (.col-md-6 > h1{ippankibanJS})
                   +.col-md-6 > .row
                        > ( .col-sm-6.smallpad > button.btn.btn-primary.btn-block@btn@run#run{Create 1,000 rows} )`
                        // + ( .col-sm-6.smallpad > button.btn.btn-primary.btn-block@btn@runlots#runlots{Create 10,000 rows} )
                        // + ( .col-sm-6.smallpad > button.btn.btn-primary.btn-block@btn@add#add{Append 1,000 rows} )
                        // + ( .col-sm-6.smallpad > button.btn.btn-primary.btn-block@btn@update#update{Update every 10th rows} )
                        // + ( .col-sm-6.smallpad > button.btn.btn-primary.btn-block@btn@clear#clear{Clear} )
                        // + ( .col-sm-6.smallpad > button.btn.btn-primary.btn-block@btn@swaprows#swaprows{Swap Rows} )`
      , run: { enumerable: true,
            value: function(){ this.broadcastEvent("run") }
        }
      , runlots: { enumerable: true,
            value: function(){ this.broadcastEvent("runlots") }
        }
      , add: { enumerable: true,
            value: function(){ this.broadcastEvent("add") }
        }
      , update: { enumerable: true,
            value: function(){ this.broadcastEvent("update") }
        }
      , clear: { enumerable: true,
            value: function(){ this.broadcastEvent("clear") }
        }
      , swaprows: { enumerable: true,
            value: function(){ this.broadcastEvent("swaprows") }
        }
    }
})

domready.then(({nodes:{body}}) => {
    body.appendChild(new App().fragment)
})
