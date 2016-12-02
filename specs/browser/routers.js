"use strict"

describe("Router", () => {
    const EventTarget = require("lib").EventTarget
    const Route = require("lib").Route
    const RouteDispatcher = require("lib").RouteDispatcher
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

        chai.expect(router.routes["/foo"].length).to.equal(2)
    })

    it("router.addRouteHandler(path, { handleRoute: ()=>{} })", () => {
        const router = new Router()
        router.addRouteHandler("/foo", { handleRoute: (route, next)=>next() })

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

        chai.expect(router.routes["/foo"].length).to.equal(2)
        chai.expect(router.routes["/bar"].length).to.equal(2)
    })

    it("router.addRouteHandler([pathes], handler)", () => {
        const router = new Router()
        const foo = (route, next)=>next()

        router.addRouteHandler(["/foo", "/bar"], foo)

        chai.expect(typeof router.routes["/foo"]).to.equal("function")
        chai.expect(typeof router.routes["/bar"]).to.equal("function")
    })

    it("router.removeRouteHandler(path, handler)", () => {
        const router = new Router()
        const foo = (route, next)=>next()
        router.addRouteHandler({
            "/foo": foo
          , "/bar": (route, next)=>next()
        })
        router.removeRouteHandler("/foo", foo)

        chai.expect(router.routes["/foo"]).to.equal(undefined)
        chai.expect(typeof router.routes["/bar"]).to.equal("function")
    })

    it("router.dispatchRoute(path) (A)", done => {
        const router = new Router()
        const foo = (route, next) => {}

        router.addRouteHandler("/foo", foo)
        const dispatch = router.dispatchRoute("/foo")

        chai.expect(RouteDispatcher.isImplementedBy(dispatch)).to.be.true
        dispatch.addEventListener("routing", e => {
            done()
        })
    })

    it("router.dispatchRoute(path) (B)", done => {
        const router = new Router()
        let hits = 0
        const foo = (route, next) => {
            hits += 1

            next()
        }

        router.addRouteHandler("/foo", foo)
        router.addRouteHandler("/foo", foo)

        const dispatch = router.dispatchRoute("/foo")

        chai.expect(RouteDispatcher.isImplementedBy(dispatch)).to.be.true
        dispatch.addEventListener("routing", e => {
            chai.expect(hits).to.equal(2)
            done()
        })
    })

    it("router.dispatchRoute(path) (C)", done => {
        const router = new Router()
        let hits = 0
        const foo = (route, next) => {
            hits += 1
        }
        const bar = (route, next) => {
            throw new Error("shouldn't go there")
            hits += 1
        }

        router.addRouteHandler("/foo", foo)
        router.addRouteHandler("/foo", bar)

        const dispatch = router.dispatchRoute("/foo")
        dispatch.addEventListener("routing", e => {
            chai.expect(hits).to.equal(e.count)
            chai.expect(e.count).to.equal(1)
            done()
        })
        chai.expect(RouteDispatcher.isImplementedBy(dispatch)).to.be.true
    })

    it("router.dispatchRoute(path) (D)", done => {
        const router = new Router

        router.addRouteHandler("*", (route, next) => {})
        router.addRouteHandler("*", (route, next) => next(true))

        const dispatch = router.dispatchRoute("/foo")
        dispatch.addEventListener("routing", e => {
            chai.expect(e.count).to.equal(1)
            done()
        })
    })

    it("router.dispatchRoute(path) (E)", done => {
        const router = new Router
        let order = 0

        router.addRouteHandler("/foo", (route, next) => {
          chai.expect(order).to.equal(2)
          order += 1
          next(false)
        })
        router.addRouteHandler("/foo", (route, next) => {
            chai.expect(order).to.equal(3)
        })
        router.addRouteHandler("*", (route, next) => {
            chai.expect(order).to.equal(0)
            order += 1
        })
        router.addRouteHandler("*", (route, next) => {
            chai.expect(order).to.equal(1)
            order += 1
            next(true)
        })

        const dispatch = router.dispatchRoute("/foo")
        dispatch.addEventListener("routing", e => {
            chai.expect(e.count).to.equal(2)
            done()
        })
    })

    it("router.dispatchRoute(path) (F)", done => {
        const router = new Router
        let order = 0

        router.addRouteHandler("/foo/:bar.:foo", (route, next) => {
          chai.expect(order).to.equal(2)

          chai.expect(route.matches.bar).to.equal("bar")
          chai.expect(route.matches.foo).to.equal("foo")

          order += 1
          next(false)
        })
        router.addRouteHandler("/:bar/bar.:foo", (route, next) => {
            chai.expect(order).to.equal(3)

            chai.expect(route.matches.bar).to.equal("foo")
            chai.expect(route.matches.foo).to.equal("foo")

            order += 1
            next()
        })
        router.addRouteHandler("/:bar/bar.foo", (route, next) => {
            chai.expect(order).to.equal(4)

            chai.expect(route.matches.bar).to.equal("foo")
        })
        router.addRouteHandler("*", (route, next) => {
            chai.expect(order).to.equal(0)
            order += 1
        })
        router.addRouteHandler("*", (route, next) => {
            chai.expect(order).to.equal(1)
            order += 1
            next(true)
        })

        const dispatch = router.dispatchRoute("/foo/bar.foo")
        dispatch.addEventListener("routing", e => {
            chai.expect(e.count).to.equal(3)
            done()
        })
    })

    it("router.dispatchRoute(path) (G - wait)", done => {
        const router = new Router
        let order = 0

        router.addRouteHandler("/foo", (route, next) => {
            route.wait(done => {
                setTimeout(() => {
                    chai.expect(order).to.equal(0)
                    order += 1

                    next()
                    done()
                }, 200)
            })
        })
        router.addRouteHandler("/foo", (route, next) => {
            chai.expect(order).to.equal(1)
        })

        router.dispatchRoute("/foo").addEventListener("routing", e => {
            chai.expect(e.count).to.equal(2)

            done()
        })
    })

    it("router.dispatchRoute(path) (H - late next error)", done => {
        const router = new Router
        const _warn = console.warn.bind(console)

        console.warn = function(msg){
            console.log("xlklxklxlkxlk")
            throw new Error(msg)
        }

        router.addRouteHandler("/H", (r, next) => {
            next()
            try {
                next()
            } catch(e) {
                chai.expect(true).to.be.true
            }
        })

        router.addRouteHandler("/H", (r, next) => {
            r.wait(ok => {
                console.log("x")
                ok()
console.log("y")
                try {
                    next()
                } catch(e) {
                    chai.expect(true).to.be.true
                    setTimeout(done, 100)
                }
                console.warn = _warn
            })
        })

        router.dispatchRoute("/H")
    })


})
