"use strict"

describe("domready", () => {
    const domready = require("lib").domready

    it("domready.then(({nodes}) => {}", done => {
        domready.then(({nodes}) => {
            setTimeout(()=> {
                chai.expect(nodes.head).to.equal(document.head)
                chai.expect(nodes.body).to.equal(document.body)
                chai.expect(!!document.querySelector("title")).to.be.true
                chai.expect(!!document.querySelector("meta[name=viewport]")).to.be.true

                done()
            }, 4)
        })
    })
})
