"use strict"

describe("Stylesheet", () => {
    const Stylesheet = require("lib").Stylesheet
    const CSSRule = require("lib").CSSRule
    const CSSMediaRule = require("lib").CSSMediaRule
    const ZParser = require("lib").ZParser

    it("new Stylesheet()", () => {
        const ss = new Stylesheet

        chai.expect(Stylesheet.isImplementedBy(ss)).to.be.true
        chai.expect(ss.node.nodeType).to.equal(Node.ELEMENT_NODE)
        chai.expect(ss.node.nodeName).to.equal("STYLE")
    })

    it(`new Stylesheet("/path/to/css")`, () => {
        const ss = new Stylesheet("/css/mocha")

        chai.expect(Stylesheet.isImplementedBy(ss)).to.be.true
        chai.expect(ss.node.nodeType).to.equal(Node.ELEMENT_NODE)
        chai.expect(ss.node.nodeName).to.equal("LINK")
    })

    it(`new Stylesheet(node)`, () => {
        const target = document.querySelector("link")
        const ss = new Stylesheet(target)

        chai.expect(Stylesheet.isImplementedBy(ss)).to.be.true
        chai.expect(ss.node.nodeType).to.equal(Node.ELEMENT_NODE)
        chai.expect(ss.node.nodeName).to.equal("LINK")
    })

    it("stylesheet.insertRule(cssRule)", done => {
        const dummy = ZParser.parse("div.foo").tree.childNodes[0]
        const ss = new Stylesheet
        const rule = new CSSRule(".foo{background:rgb(255,0,0);}")

        Promise.all([
            ss.insertRule(rule)
        ])
        .catch(e => { throw e })
        .then(()=>{
            chai.expect(ss.sheet.cssRules.length).to.equal(1)
            chai.expect(getComputedStyle(dummy).getPropertyValue("background-color")).to.equal("rgb(255, 0, 0)")
            done()
        })
    })

    it("stylesheet.insertRule(cssRule) | cssRule update", done => {
        const dummy = ZParser.parse("div.foo").tree.childNodes[0]
        const ss = new Stylesheet
        const rule = new CSSRule(".foo{background:rgb(255,0,0);}")

        Promise.all([
            ss.insertRule(rule)
        ])
        .catch(e => { throw e })
        .then(()=>{
            chai.expect(ss.sheet.cssRules.length).to.equal(1)
            chai.expect(getComputedStyle(dummy).getPropertyValue("background-color")).to.equal("rgb(255, 0, 0)")
            rule.setProperty("background", "rgb(0,255,0)")
            chai.expect(getComputedStyle(dummy).getPropertyValue("background-color")).to.equal("rgb(0, 255, 0)")
            done()
        })
    })

    it("stylesheet.deleteRule(cssRule)", done => {
        const dummy = ZParser.parse("div.bar").tree.childNodes[0]
        const ss = new Stylesheet
        const rule = new CSSRule(".bar{background:rgb(255,0,0);}")
        const rule2 = new CSSRule(".bar{color:rgb(255,0,0);}")

        Promise.all([
            ss.insertRule(rule)
          , ss.insertRule(rule2)
        ])
        .then(()=>{
            chai.expect(ss.sheet.cssRules.length).to.equal(2)
            chai.expect(getComputedStyle(dummy).getPropertyValue("background-color")).to.equal("rgb(255, 0, 0)")
            chai.expect(getComputedStyle(dummy).getPropertyValue("color")).to.equal("rgb(255, 0, 0)")

            ss.deleteRule(rule)
            .catch(e => { throw e })
            .then(() => {
                chai.expect(ss.sheet.cssRules.length).to.equal(2)
                chai.expect(getComputedStyle(dummy).getPropertyValue("background-color")).to.equal("transparent")
                chai.expect(getComputedStyle(dummy).getPropertyValue("color")).to.equal("rgb(255, 0, 0)")

                done()
            })

        })
    })
})
