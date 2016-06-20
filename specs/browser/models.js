"use strict"

describe("Model", () => {
    const Model = require("lib").Model

    describe("new Model(object data{})", () => {
        describe("i/o", () => {
            it ("creates a model instance and saves the data", done => {
                let m = new Model({ foo: { bar: "foobar" } })
                m.write({ foo: { bar: "fubiz" } })

                m.op.then(function(){
                    m.read("foo.bar").then(function(data){
                        chai.expect(data["foo.bar"]).to.equal("fubiz")

                        m.trace("foo.bar").then(function(data){
                            chai.expect(data["foo.bar"][1].value).to.equal("foobar")
                            chai.expect(data["foo.bar"][0].value).to.equal("fubiz")
                            done()
                        })
                    })
                })

                chai.expect(Model.isImplementedBy(m)).to.be.true
            })

            it ("creates data from serialized strings", done => {
                let m = new Model("foo=bar")

                m.read("foo", (err, data) => {
                    chai.expect(data.foo).to.equal("bar")

                    m.trace("foo", (err, data) => {
                        chai.expect(data.foo[0].value).to.equal("bar")
                        done()
                    })
                })
            })

            it ("creates data from json strings", done => {
                let m = new Model('{"foo":"bar"}')

                m.read("foo", (err, data) => {
                    chai.expect(data.foo).to.equal("bar")

                    m.trace("foo", (err, data) => {
                        chai.expect(data.foo[0].value).to.equal("bar")
                        done()
                    })
                })
            })

            it ("data formats — basics", done => {
                let m = new Model

                m.write("a", {
                    "b": "ab"
                  , "ab": {
                      "a": "aaba" }
                })
                m.write("c", "c")
                m.write("d", 4)
                m.write("e", true)
                m.write("f", false)
                m.write("g", ["g", "g"])

                m.read(["a.b", "a.ab", "a.ab.a", "c", "d", "e", "f", "g", "g.1"], (err, data) => {
                    chai.expect(data["a.b"]).to.equal("ab")
                    chai.expect(data["a.ab"]).to.deep.equal({ "a": "aaba" })
                    chai.expect(data["a.ab.a"]).to.equal("aaba")
                    chai.expect(data["c"]).to.equal("c")
                    chai.expect(data["d"]).to.equal(4)
                    chai.expect(data["e"]).to.be.true
                    chai.expect(data["f"]).to.be.false
                    chai.expect(data["g"]).to.deep.equal(["g", "g"])
                    chai.expect(data["g.1"]).to.equal("g")
                    done()
                })
            })

            it ("data formats — advanced", done => {
                  let m = new Model

                  m.write({
                      a: { b: [{ c: "foo" }] }
                    , z: [{ y: "bar" }, 1, true]
                  })

                  m.read(["a", "a.b", "a.b.0", "a.b.0.c", "z", "z.0", "z.0.y", "z.1", "z.2" ], (err, data)=>{
                      chai.expect(data["a"]).to.deep.equal({ b: [{ c: "foo"}] })
                      chai.expect(data["a.b"]).to.deep.equal([{c: "foo"}])
                      chai.expect(data["a.b.0"]).to.deep.equal({c: "foo"})
                      chai.expect(data["a.b.0.c"]).to.equal("foo")
                      chai.expect(data["z"]).to.deep.equal([{ y: "bar" }, 1, true])
                      chai.expect(data["z.0"]).to.deep.equal({ y: "bar" })
                      chai.expect(data["z.1"]).to.deep.equal(1)
                      chai.expect(data["z.2"]).to.deep.equal(true)
                      done()
                  })
            })

            it("data mutations - A", done => {
                let m = new Model

                m.write({
                    a: { b: "foo", c: "bar" }
                  , z: [ "y", "w" ]
                })

                m.write("a.b", "foobar")
                m.write("z.0", "foobar")

                m.read(["a", "a.b", "a.c", "z", "z.0", "z.1"], (err, data) => {
                    chai.expect(data["a.b"]).to.equal("foobar")
                    chai.expect(data["a.c"]).to.equal("bar")
                    chai.expect(data["z.0"]).to.equal("foobar")
                    chai.expect(data["z.1"]).to.equal("w")

                    chai.expect(data["a"]).to.deep.equal({ b: "foobar", c: "bar" })
                    chai.expect(data["z"]).to.deep.equal([ "foobar", "w" ])

                    done()
                })
            })

            it ("data mutations - B", done => {
                let m = new Model

                m.write({
                    a: { b: [{ c: "foo" }]}
                })

                m.write({
                    a: { b: [{ c: "bar" }] }
                })

                m.trace(["a.b", "a.b.0", "a.b.0.c"], (err, data) => {
                    chai.expect(data["a.b"][0].value).to.deep.equal([{ c: "bar" }])
                    chai.expect(data["a.b"][1].value).to.deep.equal([{ c: "foo" }])

                    chai.expect(data["a.b.0"][0].value).to.deep.equal({ c: "bar" })
                    chai.expect(data["a.b.0"][1].value).to.deep.equal({ c: "foo" })
                    chai.expect(data["a.b.0.c"][0].value).to.deep.equal("bar")
                    chai.expect(data["a.b.0.c"][1].value).to.deep.equal("foo")

                    done()
                })
            })


            it ("data mutations - C", done => {
                let m = new Model

                m.write({
                    z: [{ y: "bar" }, 1, true]
                })

                m.write({
                    z: [{ y: "foo" }]
                })

                m.trace(["z", "z.0", "z.1", "z.2"], (err, data) => {
                      chai.expect(data["z"][0].value).to.deep.equal([{ y: "foo" }])
                      chai.expect(data["z"][1].value).to.deep.equal([{ y: "bar" }, 1, true])
                      chai.expect(data["z.1"][0].value).to.equal(undefined)
                      chai.expect(data["z.1"][1].value).to.equal(1)
                      chai.expect(data["z.2"][0].value).to.equal(undefined)
                      chai.expect(data["z.2"][1].value).to.equal(true)

                      done()
                })
            })

            it ("data mutations - D", done => {
                let m = new Model

                m.write({
                    w: [{ x: { z: "foo" } }]
                })

                m.write({
                    w: [0]
                })

                m.trace(["w", "w.0.x.z"], (err, data) => {
                    chai.expect(data["w"][0].value).to.deep.equal([0])
                    chai.expect(data["w"][1].value).to.deep.equal([{ x: { z: "foo" } }])
                    chai.expect(data["w.0.x.z"][0].value).to.equal(undefined)
                    chai.expect(data["w.0.x.z"][1].value).to.equal("foo")

                    done()
                })
            })
        })

        describe("hooks", ()=>{
            it("when a key is read, the value is invoked through the defined hook, if traced, a entry is added with the hooked value", done=>{
                let m = new Model({ foofoo: "bar" })
                m.hook("foofoo", v=>v.toUpperCase())

                m.read("foofoo").then(data=>{
                    chai.expect(data.foofoo).to.equal("BAR")

                    m.trace("foofoo").then(data=>{
                        chai.expect(data.foofoo[0].value).to.equal("BAR")
                        chai.expect(data.foofoo[1].value).to.equal("bar")

                        done()
                    })
                })

            })
        })
    })

    describe("models tree", () => {
        it("values are searched in the tree ( target to root node)", done => {
            let m = new Model({ fu: "bar", biz: "fu" })
            let n = m.appendChild( new Model({ fu: "biz" }) )

            n.read(["fu", "biz"], (err, data) => {
                if ( err ) throw err

                chai.expect(data.fu[0].value).to.equal("biz")
                chai.expect(data.fu[1].value).to.equal("bar")
                chai.expect(data.biz[0].value).to.equal("fu")

                n.read(["fu", "biz"], (err, data) => {
                    if ( err ) throw err

                    chai.expect(data.fu).to.equal("biz")
                    chai.expect(data.biz).to.equal("fu")
                    done()
                })
            }, true)
        })
    })

    describe("events", ()=>{
        it ("models emit a 'busy' event when operations are running, 'idle' event when all op are done", done => {
            let m = new Model
            let i = 0
            let j = 0
            let r = 0

            m.addEventListener("busy", function onbusy(e){
                m.removeEventListener("busy", onbusy) //beware of auto self-spam of doom!

                m.addEventListener("idle", function onidle(e){
                    m.removeEventListener("idle", onidle) //beware of auto self-spam of doom!

                    m.read("foo", (err, data)=>{
                        chai.expect(data.foo).to.equal("foobar")
                        done()
                    })
                })
            })

            m.write("foo", "foo")
            m.write("foo", "bar")
            m.write("foo", "foobar")
        })

        it ("models emit an 'add' event when a key is first added during a write operation", done => {
            let m = new Model

            m.addEventListener("add", e => {
                chai.expect(e.keys).to.deep.equal(["foo"])

                done()
            })

            m.write("foo", "bar")
        })

        it ("models emit an 'update' event when any change (adding included) occurs during a write operation", done => {
            let m = new Model

            m.write("foo", "bar").then(()=>{
                m.addEventListener("update", function onupdate(e){
                    m.removeEventListener("update", onupdate)

                    chai.expect(e.keys).to.deep.equal(["foo"])

                    m.read("foo", (err, data)=>{
                        chai.expect(data.foo).to.equal("bar")
                        done()
                    })
                })

                m.write("foo", "bar")
            })
        })

        it ("models emit a 'remove' event when a key is set to 'undefined' during a write operation", done => {
            let m = new Model("foo", "bar")

            m.op.then(()=>{
                m.addEventListener("remove", e => {
                    chai.expect(e.keys).to.deep.equal(["foo"])

                    done()
                })

                m.write("foo", undefined)
            })
        })
    })
})
