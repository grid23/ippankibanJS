"use strict"

describe("Serializer", () => {
    const Serializer = require("lib").Serializer

    describe("Serializer.serialize", () => {
        it ("can serialize a one-level deep object", () => {
            let o = Serializer.serialize({ foo : "bar", bar: "foo" })
            let p = Serializer.serialize({ foo : "bar" })
            let q = Serializer.serialize({ })

            chai.expect(o).to.equal("foo=bar&bar=foo")
            chai.expect(p).to.equal("foo=bar")
            chai.expect(q).to.equal("")
        })

        it ("can serialize a one-level deep object using speficic syntax", () => {
            let o = Serializer.serialize({ foo : "bar", bar: "foo" }, { delimiter: ":", separator: ";" })
            let p = Serializer.serialize({ foo : "bar" }, { delimiter: ":", separator: ";" })
            let q = Serializer.serialize({ }, { delimiter: ":", separator: ";" })

            chai.expect(o).to.equal("foo:bar;bar:foo")
            chai.expect(p).to.equal("foo:bar")
            chai.expect(q).to.equal("")
        })

        it ("can objectify a serialized string", () => {
            let o = Serializer.objectify("foo=bar&bar=foo")
            let p = Serializer.objectify("foo=bar")
            let q = Serializer.objectify("")

            chai.expect(Object.keys(o).length).to.equal(2)
            chai.expect(o.foo).to.equal("bar")
            chai.expect(o.bar).to.equal("foo")
            chai.expect(Object.keys(p).length).to.equal(1)
            chai.expect(p.foo).to.equal("bar")
            chai.expect(Object.keys(q).length).to.equal(0)
        })

        it ("can objectify a serialized string using specific syntax", () => {
            let o = Serializer.objectify("foo:bar;bar:foo", { delimiter: ":", separator: ";" })
            let p = Serializer.objectify("foo:bar", { delimiter: ":", separator: ";" })
            let q = Serializer.objectify("", { delimiter: ":", separator: ";" })

            chai.expect(Object.keys(o).length).to.equal(2)
            chai.expect(o.foo).to.equal("bar")
            chai.expect(o.bar).to.equal("foo")
            chai.expect(Object.keys(p).length).to.equal(1)
            chai.expect(p.foo).to.equal("bar")
            chai.expect(Object.keys(q).length).to.equal(0)
        })
    })

    describe("new Serializer()", ()=>{
        it("returns a valid instance of Serializer", () => {
            var s = new Serializer

            chai.expect(Serializer.isImplementedBy(s)).to.be.true
        })

        it ("can serialize a one-level deep object", () => {
            let s = new Serializer

            let o = s.serialize({ foo : "bar", bar: "foo" })
            let p = s.serialize({ foo : "bar" })
            let q = s.serialize({ })

            chai.expect(o).to.equal("foo=bar&bar=foo")
            chai.expect(p).to.equal("foo=bar")
            chai.expect(q).to.equal("")
        })

        it ("can serialize a one-level deep object using speficic syntax", () => {
            let s = new Serializer({ delimiter: ":", separator: ";" })
            let o = s.serialize({ foo : "bar", bar: "foo" })
            let p = s.serialize({ foo : "bar" })
            let q = s.serialize({ })

            chai.expect(o).to.equal("foo:bar;bar:foo")
            chai.expect(p).to.equal("foo:bar")
            chai.expect(q).to.equal("")
        })

        it("serializer.stringify", () => {
            throw new Error("todo")
        })

        it ("can objectify a serialized string", () => {
            let s = new Serializer
            let o = s.objectify("foo=bar&bar=foo")
            let p = s.objectify("foo=bar")
            let q = s.objectify("")

            chai.expect(Object.keys(o).length).to.equal(2)
            chai.expect(o.foo).to.equal("bar")
            chai.expect(o.bar).to.equal("foo")
            chai.expect(Object.keys(p).length).to.equal(1)
            chai.expect(p.foo).to.equal("bar")
            chai.expect(Object.keys(q).length).to.equal(0)
        })

        it ("can objectify a serialized string using specific syntax", () => {
            let s = new Serializer({ delimiter: ":", separator: ";" })
            let o = s.objectify("foo:bar;bar:foo")
            let p = s.objectify("foo:bar")
            let q = s.objectify("")

            chai.expect(Object.keys(o).length).to.equal(2)
            chai.expect(o.foo).to.equal("bar")
            chai.expect(o.bar).to.equal("foo")
            chai.expect(Object.keys(p).length).to.equal(1)
            chai.expect(p.foo).to.equal("bar")
            chai.expect(Object.keys(q).length).to.equal(0)
        })
    })
})
