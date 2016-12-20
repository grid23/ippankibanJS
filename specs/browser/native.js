"use strict"

describe("native", () => {
    const native = require("lib").native

    it("native functions should be detectable", () => {
        chai.expect(native(function(){})).to.be.false
        chai.expect(native(window.addEventListener)).to.be.true
    })

    it("there are some known exceptions to take into account!", () => {
        chai.expect(native(window.CSSMediaRule)).to.be.true
    })
})
