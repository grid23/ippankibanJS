"use strict"
const chai = require("chai")

const Model = require("../../lib/Model").Model
const ZExpression = require("../../lib/ZParser").ZExpression
const ZParser = require("../../lib/ZParser").ZParser
const document = require("../../lib/ZParser").document
const window = document.defaultView
const Element = window.Element
const Node = window.Node

describe ("ZExpression & ZParser", ()=>{
    describe("new ZExpression", ()=>{
        it ("returns a valid zExpression object", ()=>{
            let e = new ZExpression

            chai.expect(ZExpression.isImplementedBy(e)).to.be.true
        })

        it ("can be iterated (zExpression[Symbol.iterator])", ()=>{
            let e = new ZExpression("span{💩}")
            let chars = []

            for ( let char of e )
              chars.push(char)

            chai.expect(chars).to.deep.equal(["s", "p", "a", "n", "{", "💩", "}"])
        })
    })

    describe("new ZParser", ()=>{
        it ("returns a valid zParser object", ()=>{
            let p = new ZParser

            chai.expect(ZParser.isImplementedBy(p)).to.be.true
        })

        describe ("parser.parse()", () => {
            it("returns a document fragment tree and a hash of reference nodes", () => {
                let r = ZParser.parse("div>span{foo}")

                chai.expect(r.tree.nodeType).to.equal(Node.DOCUMENT_FRAGMENT_NODE)
            })

            it("siblings" , () => {
                let r = ZParser.parse("ul>li+li")
                let s = ZParser.parse("li+li+li")

                chai.expect(r.tree.nodeType).to.equal(Node.DOCUMENT_FRAGMENT_NODE)
                chai.expect(r.tree.childNodes[0].nodeName).to.equal("UL")
                chai.expect(r.tree.childNodes[0].childNodes.length).to.equal(2)

                chai.expect(s.tree.nodeType).to.equal(Node.DOCUMENT_FRAGMENT_NODE)
                chai.expect(s.tree.childNodes.length).to.equal(3)
            })

            it("group (no var)", () => {
                let r = ZParser.parse("(span{foo})")

                chai.expect(r.tree.nodeType).to.equal(Node.DOCUMENT_FRAGMENT_NODE)
                chai.expect(r.tree.childNodes.length).to.equal(1)
            })

            it("group (var)", done => {
                let r = ZParser.parse("(span{$foo})", {foo: "bar"})

                r.addEventListener("ready", e=>{
                    chai.expect(r.tree.nodeType).to.equal(Node.DOCUMENT_FRAGMENT_NODE)
                    chai.expect(r.tree.childNodes.length).to.equal(1)
                    chai.expect(r.tree.childNodes[0].textContent).to.equal("bar")

                    done()
                })
            })

            it("group, children, and siblings (no var)", ()=> {
                let r = ZParser.parse("(ul>li+li)+(ul>ol+ol)")

                chai.expect(r.tree.nodeType).to.equal(Node.DOCUMENT_FRAGMENT_NODE)
                chai.expect(r.tree.childNodes.length).to.equal(2)
            })

            it("define and include sub-templates (no var)", done => {
                let sub = new ZExpression("span{foo}")
                sub.registerAs("sub")

                let r = ZParser.parse("div>&sub")

                r.addEventListener("ready", e => {
                    chai.expect(r.tree.nodeType).to.equal(Node.DOCUMENT_FRAGMENT_NODE)
                    chai.expect(r.tree.childNodes[0].childNodes[0].nodeName).to.equal("SPAN")

                    done()
                })
            })

            it("define and include sub-templates (var)", done => {
                let sub = new ZExpression("span{$foo}")
                sub.registerAs("sub2")

                let r = ZParser.parse("div>&sub2", { foo: "bar" })

                r.addEventListener("ready", e => {
                    chai.expect(r.tree.nodeType).to.equal(Node.DOCUMENT_FRAGMENT_NODE)
                    chai.expect(r.tree.childNodes[0].childNodes[0].nodeName).to.equal("SPAN")
                    chai.expect(r.tree.childNodes[0].childNodes[0].textContent).to.equal("bar")

                    done()
                })
            })

            it (" sub-templates in sub-templates (w/var)", done => {
                let sub3 = new ZExpression("span{$foo}")
                let sub4 = new ZExpression("div>&sub3")
                sub3.registerAs("sub3")
                sub4.registerAs("sub4")

                let r = ZParser.parse("&sub4", { foo: "bar" })

                r.addEventListener("ready", e => {
                      chai.expect(r.tree.nodeType).to.equal(Node.DOCUMENT_FRAGMENT_NODE)
                      chai.expect(r.tree.childNodes[0].childNodes[0].nodeName).to.equal("SPAN")
                      chai.expect(r.tree.childNodes[0].childNodes[0].textContent).to.equal("bar")

                      done()
                })
            })

            it ("setting ID on element (no var)", ()=>{
                let r = ZParser.parse("div#foo#bar") // only the last can be taken into account!

                chai.expect(r.tree.nodeType).to.equal(Node.DOCUMENT_FRAGMENT_NODE)
                chai.expect(r.tree.childNodes[0].nodeName).to.equal("DIV")
                chai.expect(r.tree.childNodes[0].id).to.equal("bar")
            })

            it ("setting ID on element (var)", done => {
                let r = ZParser.parse("div#$foo#bar", { foo: "foo" }) // the last to update will decide

                r.addEventListener("ready", e => {
                    chai.expect(r.tree.nodeType).to.equal(Node.DOCUMENT_FRAGMENT_NODE)
                    chai.expect(r.tree.childNodes[0].nodeName).to.equal("DIV")
                    chai.expect(r.tree.childNodes[0].id).to.equal("foo")

                    done()
                })
            })

            it ("setting classname on element (no var)", ()=>{
                const CLASS_LIST_COMPAT = (Element.prototype.hasOwnProperty("classList") || HTMLElement.prototype.hasOwnProperty("classList")) && function(){
                    // to be compatible, browser must be able to use classlist on a svg element
                    try {
                        document.createElementNS("http://www.w3.org/2000/svg", "svg").classList.add("x")
                        return true
                    } catch(e){}
                    return false
                }()

                let r = ZParser.parse("div.a.b.C")

                chai.expect(r.tree.nodeType).to.equal(Node.DOCUMENT_FRAGMENT_NODE)
                chai.expect(r.tree.childNodes[0].nodeName).to.equal("DIV")

                if ( CLASS_LIST_COMPAT )
                  chai.expect(r.tree.childNodes[0].classList.contains("a")).to.be.true,
                  chai.expect(r.tree.childNodes[0].classList.contains("b")).to.be.true,
                  chai.expect(r.tree.childNodes[0].classList.contains("C")).to.be.true
                else
                  chai.expect(r.tree.childNodes[0].className).to.equal(" a b C")
            })

            it ("setting classname on element (var)", done =>{
                const CLASS_LIST_COMPAT = (Element.prototype.hasOwnProperty("classList") || HTMLElement.prototype.hasOwnProperty("classList")) && function(){
                    // to be compatible, browser must be able to use classlist on a svg element
                    try {
                        document.createElementNS("http://www.w3.org/2000/svg", "svg").classList.add("x")
                        return true
                    } catch(e){}
                    return false
                }()

                let r = ZParser.parse("div.a.$b.£c", { b: "foo", c: "bar" })

                r.addEventListener("ready", e => {
                    chai.expect(r.tree.nodeType).to.equal(Node.DOCUMENT_FRAGMENT_NODE)
                    chai.expect(r.tree.childNodes[0].nodeName).to.equal("DIV")

                    if ( CLASS_LIST_COMPAT )
                      chai.expect(r.tree.childNodes[0].classList.contains("a")).to.be.true,
                      chai.expect(r.tree.childNodes[0].classList.contains("foo")).to.be.true,
                      chai.expect(r.tree.childNodes[0].classList.contains("bar")).to.be.true
                    else
                      chai.expect(r.tree.childNodes[0].className).to.equal(" a foo bar")

                    done()
                })
            })

            it ("setting attribute on element (no var)", () => {
                let r = ZParser.parse("div[test=foo][foo]")

                chai.expect(r.tree.nodeType).to.equal(Node.DOCUMENT_FRAGMENT_NODE)
                chai.expect(r.tree.childNodes[0].nodeName).to.equal("DIV")
                chai.expect(r.tree.childNodes[0].getAttribute("test")).to.equal("foo")
                chai.expect(r.tree.childNodes[0].getAttribute("foo")).to.equal("true")
            })

            it ("setting attribute on element (var)", done => {
                let r = ZParser.parse("div[test=$foo][test2=£bar]", { foo: "bar", bar: "foo" })

                r.addEventListener("ready", e => {
                    chai.expect(r.tree.nodeType).to.equal(Node.DOCUMENT_FRAGMENT_NODE)
                    chai.expect(r.tree.childNodes[0].nodeName).to.equal("DIV")
                    chai.expect(r.tree.childNodes[0].getAttribute("test")).to.equal("bar")
                    chai.expect(r.tree.childNodes[0].getAttribute("test2")).to.equal("foo")

                    done()
                })
            })

            it ("setting text content (no var)", () => {
                let r = ZParser.parse("span{foo}")

                chai.expect(r.tree.nodeType).to.equal(Node.DOCUMENT_FRAGMENT_NODE)
                chai.expect(r.tree.childNodes[0].nodeName).to.equal("SPAN")
                chai.expect(r.tree.childNodes[0].textContent).to.equal("foo")

            })



            it ("setting text content ( w/ vars ) A", done => {
                let r = ZParser.parse("span{lorem ipsum $foo solor £bar damet $foo}", {
                    foo: "a", bar: "b"
                })

                r.addEventListener("ready", e => {
                    chai.expect(r.tree.nodeType).to.equal(Node.DOCUMENT_FRAGMENT_NODE)
                    chai.expect(r.tree.childNodes[0].nodeName).to.equal("SPAN")
                    chai.expect(r.tree.childNodes[0].childNodes.length).to.equal(6)
                    chai.expect(r.tree.childNodes[0].textContent).to.equal("lorem ipsum a solor b damet a")

                    done()
                })
            })

            it ("setting text content ( w/ vars - unsafe ) B", done => {
                let r = ZParser.parse("span{£foo}", {
                    foo: "<b>a</b>"
                })

                r.addEventListener("ready", e => {
                    chai.expect(r.tree.nodeType).to.equal(Node.DOCUMENT_FRAGMENT_NODE)
                    chai.expect(r.tree.childNodes[0].nodeName).to.equal("SPAN")
                    //chai.expect(r.tree.childNodes[0].childNodes.length).to.equal(1)
                    chai.expect(r.tree.childNodes[0].textContent).to.equal("<b>a</b>")

                    done()
                })
            })

            it ("node references", done => {
                let sub5 = new ZExpression("a[href=$href]>span@{£foo}")
                sub5.registerAs("sub5")
                let r = ZParser.parse("(span@bar>&sub5) + span", { foo: "bar", href: "#foo" })

                r.addEventListener("ready", e => {
                    chai.expect(r.tree.nodeType).to.equal(Node.DOCUMENT_FRAGMENT_NODE)
                    chai.expect(r.tree.childNodes[0].nodeName).to.equal("SPAN")
                    chai.expect(r.tree.childNodes[0].childNodes[0].nodeName).to.equal("A")
                    chai.expect(r.tree.childNodes[0].childNodes[0].childNodes[0].nodeName).to.equal("SPAN")

                    chai.expect([...r.refs["root"]].length).to.equal(2)
                    chai.expect([...r.refs["bar"]][0]).to.equal(r.tree.childNodes[0])
                    chai.expect([...r.refs["a"]][0]).to.equal(r.tree.childNodes[0].childNodes[0])
                    chai.expect([...r.refs["span"]][0]).to.equal(r.tree.childNodes[0].childNodes[0].childNodes[0])

                    done()
                })
            })

            it ("templates with a structured tree of models", done => {
                let moda = new Model({
                    locale: {
                        FOO: "foo"
                      , BAR: "bar"
                      , FOOBAR: "foobar"
                    }
                })
                let modb = new Model({
                    url: "#foo/bar"
                  , fu: "fufufu"
                })

                moda.appendChild(modb)

                let titlesub = new ZExpression("ul>li{$locale.FOO}+li{$locale.BAR}")
                                  .registerAs("titlesub")

                let r = ZParser.parse("div>&titlesub+a[href=$url]{$fu}", modb)

                Promise.all([
                    new Promise((resolve, reject) => {
                        moda.read("locale.FOO", (err, data) => {
                            resolve()
                        })
                    })
                  , new Promise((resolve, reject) => {
                      modb.read("locale.FOO", (err, data) => {
                          resolve()
                      })
                  })
                  , new Promise((resolve, reject) => {
                        r.addEventListener("ready", e => {
                          resolve()
                        })
                    })
                ]).then(() => {
                    r.update(err => {
                        chai.expect(r.tree.nodeType).to.equal(Node.DOCUMENT_FRAGMENT_NODE)
                        chai.expect(r.tree.childNodes[0].nodeName).to.equal("DIV")
                        chai.expect(r.tree.childNodes[0].childNodes[0].nodeName).to.equal("UL")
                        chai.expect(r.tree.childNodes[0].childNodes[0].childNodes[0].textContent).to.equal("foo")
                        chai.expect(r.tree.childNodes[0].childNodes[0].childNodes[1].textContent).to.equal("bar")
                        chai.expect(r.tree.childNodes[0].childNodes[1].nodeName).to.equal("A")
                        chai.expect(r.tree.childNodes[0].childNodes[1].getAttribute("href")).to.equal("#foo/bar")
                        chai.expect(r.tree.childNodes[0].childNodes[1].textContent).to.equal("fufufu")

                        done()
                    })
                })
            })
        })
    })
})
