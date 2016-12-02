"use strict"

describe("Event", () => {
    const klass = require("lib").class
    const Event = require("lib").Event
    const EventTarget = require("lib").EventTarget
    const Node = require("lib").Node

    it("Event instantiation", () => {
        const event = new Event("test")

        chai.expect(event.type).to.equal("test")
        chai.expect(Event.isImplementedBy(event)).to.be.true
        chai.expect(event.state).to.equal(Event.INITIALIZED)
    })

    it("new Event(string type, { bubbles:true|false, cancelable:true|false })", ()=>{
        const e = new Event("test", { bubbles:false, cancelable:false })
        const d = new Event("test", { bubbles:true, cancelable:true })

        chai.expect(e.cancelable).to.be.false
        chai.expect(e.bubbles).to.be.false
        chai.expect(d.cancelable).to.be.true
        chai.expect(d.bubbles).to.be.true
    })
})

describe("EventTarget", () => {
    const klass = require("lib").class
    const Event = require("lib").Event
    const EventTarget = require("lib").EventTarget
    const Node = require("lib").Node

    it("EventTarget instantiation", () => {
        const target = new EventTarget

        chai.expect(EventTarget.isImplementedBy(target)).to.be.true
    })

    it("eventTarget.addEventListener(string type, fn handler())", done => {
        let et = new EventTarget
        let count = et.addEventListener("foo", function(e){
            chai.expect(e.detail).to.equal(null)
            done()
        })

        chai.expect(count).to.equal(1)
        et.dispatchEvent("foo")
    })

    it("eventTarget.addEventListener(string type, object handler{ fn handleEvent() })", done => {
        let et = new EventTarget
        let count = et.addEventListener("foo", {
            bar: "foo"
          , handleEvent: function(e){
                chai.expect(this.bar).to.equal("foo")
                chai.expect(e.detail).to.equal(null)
                done()
            }
        })

        chai.expect(count).to.equal(1)
        et.dispatchEvent("foo")
    })

    it("eventTarget.addEventListener(object handlers{ key: value })", done => {
        let et = new EventTarget
        let count = et.addEventListener({
              "bar": function(e){
                  chai.expect(e.detail).to.equal(null)
                  done()
              }
            , "foo": {
                  bar: "foo"
                , handleEvent: function(e){
                      chai.expect(this.bar).to.equal("foo")
                      chai.expect(e.detail).to.equal(null)
                  }
              }
        })

        et.addEventListener("bar", function(){})

        chai.expect(count).to.equal(2)
        chai.expect(et.events.foo.constructor).to.equal(Object)
        chai.expect(et.events.bar.length).to.equal(2)
        et.dispatchEvent("foo")
        et.dispatchEvent("bar")
    })

    it("eventTarget.removeEventListener(string type, fn handler())", () => {
        let et = new EventTarget
        let foo = function(e){}
        let bar = function(e){}
        et.addEventListener("foo", foo)
        et.addEventListener("foo", bar)
        let count = et.removeEventListener("foo", foo)

        chai.expect(count).to.equal(1)
        chai.expect(et.events["foo"]).to.equal(bar)
    })


      it("eventTarget.removeEventListener(string type, object handler{ fn handleEvent() })", function(){
          let et = new EventTarget
          let foo = { handleEvent: function(e){} }
          let bar = { handleEvent: function(e){} }
          et.addEventListener("foo", foo)
          et.addEventListener("foo", bar)
          let count = et.removeEventListener("foo", foo)

          chai.expect(count).to.equal(1)
          chai.expect(et.events["foo"]).to.equal(bar)
      })

      it("eventTarget.removeEventListener(object handlers{ key: value})", function(){
          let et = new EventTarget
          let foo = { handleEvent: function(e){} }
          let bar = { handleEvent: function(e){} }
          et.addEventListener("foo", foo)
          et.addEventListener("bar", bar)
          let count = et.removeEventListener({ foo, bar })

          chai.expect(count).to.equal(2)
          chai.expect(et.events["foo"]).to.be.undefined
          chai.expect(et.events["bar"]).to.be.undefined
      })

    it("capture phase and bubbling phase (basics)", done => {
            let e = new EventTarget
            let i = 0

            Promise.all([
                new Promise(function(resolve, reject){
                    e.addEventListener("foo", e => {
                        chai.expect(i).to.equal(0)
                        i += 1
                        resolve()
                    }, true)
                })
              , new Promise(resolve => {
                    e.addEventListener("foo", e => {
                        chai.expect(i).to.equal(1)
                        i += 1
                        resolve()
                    })
              })
            ]).then(() => {
                chai.expect(i).to.equal(2)
                done()
            }, err=>{
                throw err
            })

            e.dispatchEvent("foo")
    })

    describe("nodes and events", ()=>{
        it("events go from root to target ( capture ), then from target to root (bubble)", done => {
            let a = new Node
            let b = a.appendChild(new Node)
            let c = b.appendChild(new Node)
            let d = c.appendChild(new Node)

            let i = 0

            Promise.all([
                new Promise(resolve => {
                    a.addEventListener("foo", e => {
                        chai.expect(i).to.equal(0)
                        chai.expect(e.target).to.equal(c)
                        i += 1
                        resolve()
                    }, true)
                })
              , new Promise(resolve => {
                    b.addEventListener("foo", e => {
                        chai.expect(i).to.equal(1)
                        chai.expect(e.target).to.equal(c)
                        i += 1
                        resolve()
                    }, true)
                })
              , new Promise(resolve => {
                    c.addEventListener("foo", e => {
                        chai.expect(i).to.equal(2)
                        chai.expect(e.target).to.equal(c)

                        i += 1
                        resolve()
                    }, true)
                })
              , new Promise(resolve => {
                    c.addEventListener("foo", e => {
                        chai.expect(i).to.equal(3)
                        chai.expect(e.target).to.equal(c)
                        i += 1
                        resolve()
                    })
                })
              , new Promise(resolve => {
                    b.addEventListener("foo", e => {
                        chai.expect(i).to.equal(4)
                        chai.expect(e.target).to.equal(c)

                        i += 1
                        resolve()
                    })
                })
              , new Promise(resolve => {
                    a.addEventListener("foo", e => {
                        chai.expect(i).to.equal(5)
                        chai.expect(e.target).to.equal(c)

                        i += 1
                        resolve()
                    })
                })

            ]).then(()=>{
                chai.expect(i).to.equal(6)
                done()
            }, err => {
                throw err
            })


            c.dispatchEvent("foo")
        })

        it("cancelled event (sync)", () => {
            let e = new Event("foo")
            Event.keepAlive(e)
            let a = new Node

            a.addEventListener("foo", e => {
                e.preventDefault()
            })

            a.dispatchEvent(e)

            chai.expect(e.cancelled).to.be.true
            Event.destroy(e)
        })

        it("no bubbling", done => {
            let a = new Node
            let b = a.appendChild(new Node)
            let c = b.appendChild(new Node)

            let i = 0

            a.addEventListener("foo", e => { //won't fire unless event bubbles
                throw new Error("has bubbled")
            })

            Promise.all([
                new Promise(resolve => {
                    a.addEventListener("foo", e => {
                        chai.expect(i).to.equal(0)
                        chai.expect(e.target).to.equal(b)

                        i += 1
                        resolve()
                    }, true)
                })
              , new Promise(resolve => {
                    b.addEventListener("foo", e => {
                        chai.expect(i).to.equal(1)
                        chai.expect(e.target).to.equal(b)

                        i += 1
                        resolve()
                    }, true)
                })
              , new Promise(resolve => {
                    b.addEventListener("foo", e => {
                        chai.expect(i).to.equal(2)
                        chai.expect(e.target).to.equal(b)

                        i += 1
                        resolve()
                    })
                })
            ]).then(()=>{
                chai.expect(i).to.equal(3)
                done()
            }, err => { throw err })

            b.dispatchEvent(new Event("foo", { bubbles: false }))
        })

        /*
        it("event.wait()", done => {
            let a = new Node
            let b = a.appendChild(new Node)
            let c = b.appendChild(new Node)
            let start = Date.now()
            let i = 0

            Promise.all([
                new Promise(resolve => {
                    a.addEventListener("foo", e => {
                        chai.expect(i).to.equal(0)
                        chai.expect(e.target).to.equal(c)
                        i += 1

                        e.wait(done =>{
                            setTimeout(done, 500)
                        })

                        resolve()
                    }, true)
                })
              , new Promise(resolve => {
                    b.addEventListener("foo", e => {
                        let time = Date.now() - start

                        chai.expect( time > 500 ).to.be.true
                        chai.expect(i).to.equal(1)
                        chai.expect(e.target).to.equal(c)

                        i += 1

                        resolve()
                    }, true)
                })
              , new Promise(resolve => {
                    c.addEventListener("foo", e => {
                        chai.expect(i).to.equal(2)
                        chai.expect(e.target).to.equal(c)

                        i += 1

                        resolve()
                    })
                })
            ]).then(() => {
                let time = Date.now() - start
                chai.expect(i).to.equal(3)
                chai.expect( time > 500 ).to.be.true

                done()
            }, err => { throw err })

            c.dispatchEvent("foo")
        })
        */
        it("event.stop()", done => {
            let a = new Node
            let b = a.appendChild(new Node)
            let c = b.appendChild(new Node)

            a.addEventListener("foo", e => { // can't be triggered unless the event isn't stopped
                throw new Error
            })

            b.addEventListener("foo", e=> {
                e.stop()

                setTimeout(()=>{ done() }, 100)
            })

            c.dispatchEvent("foo")
        })

    })
})
