"use strict"

describe("CSSRule", () => {

    const CSSRule = require("lib").CSSRule

    it("new CSSRule(selector, csstext)" , () => {
        const rule = new CSSRule(".foo", "background:black; color:white; border: 1px solid red")

        chai.expect(CSSRule.isImplementedBy(rule)).to.be.true
    })

    it("new CSSRule(`selector{ csstext }`)" , () => {
        const rule = new CSSRule(".foo { background:black; color:white; border: 1px solid red }")

        chai.expect(CSSRule.isImplementedBy(rule)).to.be.true
    })

    it("new CSSRule(selector, { props })", () => {
        const rule = new CSSRule(".foo", {
            background: "black"
          , color: "white"
          , border: "1px solid red"
        })
    })
})
