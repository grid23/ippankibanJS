"use strict"

describe("Cookie", () => {
    const Cookie = require("lib").Cookie
    const Model = require("lib").Model

    it("new Cookie()", done => {
        const c = new Cookie()
        const v = Math.random()

        c.addEventListener("cookiesync", e => {
            chai.expect(!!unescape(document.cookie).match(`__noname={"foo":${v}}`)).to.be.true
            done()
        })
        window.addEventListener("beforeunload", e=>c.clear())
        c.write("foo", v)

        chai.expect(Cookie.isImplementedBy(c))
        chai.expect(Model.isImplementedBy(c))
    })

    it ("new Cookie(name)", done => {
        const c = new Cookie("foofoo")
        const v = Math.random()

        c.addEventListener("cookiesync", e => {
            chai.expect(!!unescape(document.cookie).match(`foofoo={"foo":${v}}`)).to.be.true
            done()
        })
        window.addEventListener("beforeunload", e=>c.clear())
        c.write("foo", v)

        chai.expect(Cookie.isImplementedBy(c))
        chai.expect(Model.isImplementedBy(c))
    })

    it("new Cookie({...})", done => {
        const c = new Cookie({ name: "barbar", session: true })
        const v = Math.random()

        c.addEventListener("cookiesync", e => {
            chai.expect(!!unescape(document.cookie).match(`barbar={"foo":${v}}`)).to.be.true
            done()
        })
        window.addEventListener("beforeunload", e=>c.clear())
        c.write("foo", v)

        chai.expect(Cookie.isImplementedBy(c))
        chai.expect(Model.isImplementedBy(c))
    })
})
