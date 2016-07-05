"use strict"

describe("Service", () => {
    const Node = require("lib").Node
    const Service = require("lib").Service

    it ("new Service(url)", () => {
        const s = new Service(document.location.href)

        chai.expect(Node.isImplementedBy(s)).to.be.true
        chai.expect(Service.isImplementedBy(s)).to.be.true
    })

    it("service.request(cb) | ok", done => {
        const s = new Service(document.location.href)

        s.request((err, status, req) => {
            chai.expect(!!err).to.be.false
            chai.expect(!!req).to.be.true
            chai.expect(status).to.equal(200)

            done()
        })
    })

    it("service.request(cb) | err", done => {
        const s = new Service("/wont/work")

        s.request((err, status, req) => {
            chai.expect(!!err).to.be.true
            chai.expect(!!req).to.be.true
            chai.expect(status).to.equal(404)

            done()
        })
    })

    it("tests", ()=>{
        throw new Error("todo")
    })
})
