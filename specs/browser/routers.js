"use strict"

describe("Router", () => {
    const EventTarget = require("lib").EventTarget
    const Route = require("lib").Route
    const Router = require("lib").Router

    it("new Router()", () => {
        const router = new Router

        chai.expect(Router.isImplementedBy(router)).to.be.true
        chai.expect(EventTarget.isImplementedBy(router)).to.be.true
    })

    it("router.addRouteHandler(path, handler)", () => {
        const router = new Router()
        router.addRouteHandler("/foo", (route, next)=>next())
        router.addRouteHandler("/foo", (route, next)=>next())

        chai.expect(Router.isImplementedBy(router)).to.be.true
        chai.expect(EventTarget.isImplementedBy(router)).to.be.true
        chai.expect(router.routes["/foo"].length).to.equal(2)
    })

    it("router.addrouteHandler(path, { handleRoute: ()=>{} })", () => {
        const router = new Router()
        router.addRouteHandler("/foo", { handleRoute: (route, next)=>next() })

        chai.expect(Router.isImplementedBy(router)).to.be.true
        chai.expect(EventTarget.isImplementedBy(router)).to.be.true
        chai.expect(typeof router.routes["/foo"].handleRoute).to.equal("function")
    })

    it("router.addRouteHandler({path: handler})", ()=> {
        const router = new Router()
        router.addRouteHandler({
            "/foo": (route, next)=>next()
          , "/bar": (route, next)=>next()
        })
        router.addRouteHandler({
            "/foo": (route, next)=>next()
          , "/bar": (route, next)=>next()
        })


        chai.expect(Router.isImplementedBy(router)).to.be.true
        chai.expect(EventTarget.isImplementedBy(router)).to.be.true
        chai.expect(router.routes["/foo"].length).to.equal(2)
        chai.expect(router.routes["/bar"].length).to.equal(2)
    })

    it("new Router({path, handler})", () => {
        const router = new Router({
            "/foo": (route, next)=>next()
          , "/bar": { handleRoute: (route, next)=>next() }
        })

        chai.expect(Router.isImplementedBy(router)).to.be.true
        chai.expect(EventTarget.isImplementedBy(router)).to.be.true
        chai.expect(typeof router.routes["/foo"]).to.equal("function")
        chai.expect(typeof router.routes["/bar"].handleRoute).to.equal("function")
    })
})
