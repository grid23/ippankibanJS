"use strict"

describe("CSSConditionalRule", () => {
    const CSSConditionalRule = require("lib").CSSConditionalRule

    it ("new CSSConditionalRule", () => {
        const rule = new CSSConditionalRule("@media(min-width:500px){}")

        chai.expect(CSSConditionalRule.isImplementedBy(rule)).to.be.true
        chai.expect(rule.condition).to.equal("media")
        chai.expect(rule.conditionText).to.equal("(min-width:500px)")
    })
})

describe("CSSMediaRule", () => {
    const CSSConditionalRule = require("lib").CSSConditionalRule
    const CSSMediaRule = require("lib").CSSMediaRule

    it ("new CSSMediaRule(csstext)", () => {
        const rule = new CSSMediaRule("@media(min-width:500px){ .foo{ background: black } }")

        chai.expect(CSSConditionalRule.isImplementedBy(rule)).to.be.true
        chai.expect(CSSMediaRule.isImplementedBy(rule)).to.be.true
        chai.expect(rule.condition).to.equal("media")
        chai.expect(rule.conditionText).to.equal("(min-width:500px)")
    })
})

describe("CSSRule", () => {

    const CSSRule = require("lib").CSSRule

    it("new CSSRule(selector, csstext)" , () => {
        const rule = new CSSRule(".foo", "background:black; color:white; border: 1px solid red")

        chai.expect(!!rule.getProperty("background").match("black")).to.be.true
        chai.expect(rule.getProperty("color")).to.equal("white")
        chai.expect(rule.getProperty("border")).to.equal("1px solid red")
        chai.expect(CSSRule.isImplementedBy(rule)).to.be.true
    })

    it("new CSSRule(`selector{ csstext }`)" , () => {
        const rule = new CSSRule(".foo { background:black; color:white; border: 1px solid red }")

        chai.expect(!!rule.getProperty("background").match("black")).to.be.true
        chai.expect(rule.getProperty("color")).to.equal("white")
        chai.expect(rule.getProperty("border")).to.equal("1px solid red")
        chai.expect(CSSRule.isImplementedBy(rule)).to.be.true
    })

    it("new CSSRule(selector, { props })", () => {
        const rule = new CSSRule(".foo", {
            background: "black"
          , color: "white"
          , border: "1px solid red"
        })

        chai.expect(!!rule.getProperty("background").match("black")).to.be.true
        chai.expect(rule.getProperty("color")).to.equal("white")
        chai.expect(rule.getProperty("border")).to.equal("1px solid red")
        chai.expect(CSSRule.isImplementedBy(rule)).to.be.true
    })

    it("cssRule.setProperty(prop, value)", done => {
        const rule = new CSSRule(".foo")

        rule.addEventListener("csstextupdate", e => {
            chai.expect(!!rule.getProperty("background").match("black")).to.be.true

            done()
        })

        rule.setProperty("background", "black")
    })
})
