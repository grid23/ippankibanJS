"use strict"

const chai = require("chai")
const Model = require("../../lib/Model").Model
const View = require("../../lib/View").View
const ZExpression = require("../../lib/ZParser").ZExpression
const ZParser = require("../../lib/ZParser").ZParser

const document = require("../../lib/ZParser").document
const window = document.defaultView
const Element = window.Element
const Node = window.Node

describe("View", () => {

    it("new View() returns a valid (but empty) view", done => {
        let v = new View

        chai.expect(View.isImplementedBy(v))
        chai.expect(v.expression.string).to.equal("div")
        done()
    })

    it(`new View("span") == new View(new ZExpression("span")) `, done => {
        let v = new View("span")
        let w = new View(new ZExpression("span"))

        chai.expect(v.expression.string).to.equal("span")
        chai.expect(w.expression.string).to.equal("span")
        done()
    })

    it (`new View({ foo: bar }) = new View( new Model({ foo: bar }))`, done => {
        let v = new View({foo: "bar"})
        let w = new View(new Model({foo: "bar"}))

        v.model.read("foo", (err, data) => {
            chai.expect(data.foo).to.equal("bar")

            w.model.read("foo", (err, data) => {
                chai.expect(data.foo).to.equal("bar")

                done()
            })
        })
    })

    it (`new View("span{$foo}", { foo: "bar" }) === new View(new ZExpression("span{$foo}"), new Model({ foo: "bar"}))`, done => {
        let v = new View("span{$foo}", { foo: "bar" })
        let w = new View(new ZExpression("span{$foo}"), new Model({ foo: "bar"}))

        v.model.read("foo", (err, data) => {
            chai.expect(data.foo).to.equal("bar")
            chai.expect(v.fragment.childNodes[0].nodeName).to.equal("SPAN")

            w.model.read("foo", (err, data) => {
                chai.expect(w.fragment.childNodes[0].nodeName).to.equal("SPAN")
                chai.expect(data.foo).to.equal("bar")

                done()
            })
        })
    })

    it ("the underlying expression events are chained to the view", done => {
        let v = new View("span{$foo}", { foo: "bar" })
        v.addEventListener("ready", e => {
            chai.expect(true).to.be.true
            done()
        })
    })

    it("getting references from templates (one root dom node)", done => {
        let v = new View("div> span@foo{$foo} + span@foo{$foo}", { foo: "bar" })

        v.addEventListener("ready", e => {
            chai.expect(v.root).to.equal(v.query("root"))
            chai.expect(v.query("root").nodeName).to.equal("DIV")
            chai.expect(v.query("foo").nodeName).to.equal("SPAN")
            chai.expect(v.queryAll("foo").length).to.equal(2)
            chai.expect(v.queryAll("foo")[0].nodeName).to.equal("SPAN")
            chai.expect(v.queryAll("foo")[1].nodeName).to.equal("SPAN")
            done()
        })
    })

    it(" chaining view and readyness ", done => {
        let v = new View("div > span@span{$foo}", {foo: "bar"})
        v.appendAt( "span", new View("span{$bar}", { bar: "foo"}) )

        v.addEventListener("ready", e => {
            chai.expect(v.node.span.textContent).to.equal("barfoo")
            done()
        })
    })

})
