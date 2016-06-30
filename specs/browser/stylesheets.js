"use strict"

describe("Stylesheet", () => {
    const Stylesheet = require("lib").Stylesheet

    it("new Stylesheet()", () => {
        const ss = new Stylesheet

        console.log(ss.node)
        chai.expect(Stylesheet.isImplementedBy(ss)).to.be.true
        chai.expect(ss.node.nodeType).to.equal(Node.ELEMENT_NODE)
        chai.expect(ss.node.nodeName).to.equal("STYLE")
    })
})
