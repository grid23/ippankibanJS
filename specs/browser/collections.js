"use strict"

describe("Collection", () => {
    const Collection = require("lib").Collection
    const Model = require("lib").Model
    const Node = require("lib").Node

    it ( "new Collection()", () => {
        const col = new Collection

        chai.expect(Node.isImplementedBy(col)).to.be.true
        chai.expect(Collection.isImplementedBy(col)).to.be.true
    })

    it ("collection.addModel(model, ...)", () => {
        const col = new Collection
        const m = new Model
        const n = new Model

        col.addModel(m)
        col.addModel(m, n)

        chai.expect(col.size).to.equal(2)
        chai.expect(col.hasModel(m)).to.be.true
        chai.expect(col.hasModel(m, n)).to.be.true
    })

    it ("collection.addModel([model, ...])", () => {
        const col = new Collection
        const m = new Model
        const n = new Model

        col.addModel([m, n])

        chai.expect(col.size).to.equal(2)
        chai.expect(col.hasModel(m)).to.be.true
        chai.expect(col.hasModel(m, n)).to.be.true
    })

    it ("collection.removeModel(model, ...)", () => {
        const col = new Collection
        const m = new Model
        const n = new Model

        col.addModel(m)
        col.addModel(m, n)

        chai.expect(col.size).to.equal(2)
        chai.expect(col.hasModel(m)).to.be.true
        chai.expect(col.hasModel(m, n)).to.be.true

        col.removeModel(m)
        chai.expect(col.size).to.equal(1)
        chai.expect(col.hasModel(m)).to.be.false
        chai.expect(col.hasModel(n)).to.be.true
        chai.expect(col.hasModel(m, n)).to.be.false
    })

    it ("collection.removeModel([model, ...])", () => {
        const col = new Collection
        const m = new Model
        const n = new Model

        col.addModel([m, n])

        chai.expect(col.size).to.equal(2)
        chai.expect(col.hasModel(m)).to.be.true
        chai.expect(col.hasModel(m, n)).to.be.true

        col.removeModel(m)
        chai.expect(col.size).to.equal(1)
        chai.expect(col.hasModel(m)).to.be.false
        chai.expect(col.hasModel(n)).to.be.true
        chai.expect(col.hasModel(m, n)).to.be.false
    })

    it ("collection.find({ key: value })", done => {
        const col = new Collection
        const models = [
            { foo: "bar", fu: 0 }
          , { foo: "biz", fu: 1 }
          , { foo: "bar", fu: 2 }
          , { foo: "biz", fu: 3 }
        ]

        col.addModel(models)
        chai.expect(col.size).to.equal(4)

        col.find({
            foo: "bar"
        }, (err, models) => {
            chai.expect(models.length).to.equal(2)

            col.find({
                foo: function(v){ return !!v }
              , fu: function(v){  return v > 1 }
            }, (err, models) => {
                chai.expect(models.length).to.equal(2)

                done()
            })
        })
    })

    it ("collection.subset({ key: value })", done => {
        const col = new Collection
        const models = [
            { foo: "bar", fu: 0 }
          , { foo: "biz", fu: 1 }
          , { foo: "bar", fu: 2 }
          , { foo: "biz", fu: 3 }
        ]

        col.addModel(models)
        chai.expect(col.size).to.equal(4)
        const subset = col.subset({ foo: "bar"})

        subset.addEventListener("subsetready", e => {
            chai.expect(subset.size).to.equal(2)

            done()
        })
    })

    it ("collection.sort([keys], sort, cb)", done => {
        const col = new Collection
        const models = [
            { foo: "bar", fu: 2 }
          , { foo: "biz", fu: 0 }
          , { foo: "bar", fu: 3 }
          , { foo: "biz", fu: 1 }
        ]

        col.addModel(models)
        chai.expect(col.size).to.equal(4)

        col.sort(["foo", "fu"], (a, b) => {
            return a.fu - b.fu
        }, (err, sorted) => {

            sorted[0].read("fu", (err, data) => {
                chai.expect(data.fu).to.equal(0)

                sorted[3].read("fu", (err, data) => {
                    chai.expect(data.fu).to.equal(3)

                    done()
                })
            })
        })
    })

    it("collection.fecth(service)", done => {
        const col = new Collection

        col.fetch(location.protocol+location.host+"/specs/data.json", (err, created) => {
            chai.expect(col.size).to.equal(4)

            col.models[0].read(["fu", "foo"], (err, data) => {
                chai.expect(data.foo).to.equal("bar")
                chai.expect(data.fu).to.equal(0)

                done()
            })
        })
    })
})
