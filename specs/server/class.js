"use strict"

const chai = require("chai")
const klass = require("../../lib/class").class

describe("class()", () => {
    describe("class(obj {})", () => {
        it("should accept an object as a prototype definition", () => {
            let X = klass({
                foo: function(){ return true }
              , bar: true
            })

            let x = new X
            chai.expect(x.foo()).to.be.true
            chai.expect(x.bar).to.be.true
        })
    })

    describe("class(descriptors {})", function(){
        it("should accept a descriptor object as a prototype definition", () => {
            let X = klass({
                foo: { enumerable: true, value: function(){ return true } }
              , bar: { enumerable: true, get: function(){ return true } }
              , foobar: { enumerable: true, value: true }
              , fu: { enumerable: true, get: function(){ return this._fu }, set: function(v){ this._fu = v } }
            })

            let x = new X
            x.fu = true
            chai.expect(x.foo()).to.be.true
            chai.expect(x.bar).to.be.true
            chai.expect(x.foobar).to.be.true
            chai.expect(x._fu).to.be.true
            chai.expect(x.fu).to.be.true
        })
    })

    describe("class(mixed {})", () => {
        it("should accept an object containing both usual key=>value pairs and descriptors as a prototype definition", () => {
            let X = klass({
                foo: { enumerable: true, value: function(){ return true } }
              , bar: true
              , foobar: true
              , fu: { enumerable: true, get: function(){ return this._fu }, set: function(v){ this._fu = v } }
            })

            let x = new X
            x.fu = true
            chai.expect(x.foo()).to.be.true
            chai.expect(x.bar).to.be.true
            chai.expect(x.foobar).to.be.true
            chai.expect(x._fu).to.be.true
            chai.expect(x.fu).to.be.true
        })
    })

    describe("class(fn(statics))", function(){
        it("should accept a function invoked with the statics argument, as long as it returns a valid object", () => {
            let X = klass(function(statics){

                return {
                    foo: { enumerable: true, value: function(){ return true } }
                  , bar: true
                  , foobar: true
                  , fu: { enumerable: true, get: function(){ return this._fu }, set: function(v){ this._fu = v } }
                }
            })

            let x = new X
            x.fu = true
            chai.expect(x.foo()).to.be.true
            chai.expect(x.bar).to.be.true
            chai.expect(x.foobar).to.be.true
            chai.expect(x._fu).to.be.true
            chai.expect(x.fu).to.be.true
        })

        it("should have the statics argument applied to the class object in the same manner as the prototype definition", () => {
            let X = klass(function(statics){
                Object.defineProperties(statics, {
                    foo: { enumerable: true, value: function(){ return true } }
                })

                statics.bar = true

                return {}
            })

            chai.expect(X.foo()).to.be.true
            chai.expect(X.bar).to.be.true
        })
    })

    describe("class({ constructor: fn() })", () => {
        it("should assign the constructor property as the class constructor", () => {
            let X = klass(function(){
                let instances = new WeakMap

                return {
                    constructor: function(){
                        instances.set(this, Object.create(null))
                        this.foo = true
                    }
                  , foo: { enumerable: true,
                        get: function(){ return instances.get(this).foo }
                      , set: function(v){ instances.get(this).foo = v  }
                    }
                }
            })

            let x = new X
            chai.expect(x.foo).to.be.true
        })
    })

    describe("class([Super, [Super...]], {})", () => {
        it("should inherit left arguments as Super classes", () => {
            let A = klass(()=>{
                let instances = new WeakMap

                return {
                    constructor: function(){
                        instances.set(this, Object.create(null))
                        this.foo = true
                    }
                  , foo: { enumerable: true,
                        get: function(){ return instances.get(this).foo }
                      , set: function(v){ instances.get(this).foo = v  }
                    }
                }
            })

            let B = klass(()=>{
                let instances = new WeakMap

                return {
                    constructor: function(){
                        instances.set(this, Object.create(null))
                        this.bar = true
                    }
                  , bar: { enumerable: true,
                        get: function(){ return instances.get(this).bar }
                      , set: function(v){ instances.get(this).bar = v  }
                    }
                }
            })

            let C = klass(A, B, ()=>{
                let instances = new WeakMap

                return {
                    constructor: function(){
                        instances.set(this, Object.create(null))
                        A.call(this)
                        B.call(this)
                        this.foobar = true
                    }
                  , foobar: { enumerable: true,
                        get: function(){ return instances.get(this).foobar }
                      , set: function(v){ instances.get(this).foobar = v  }
                    }
                }
            })

            let c = new C

            chai.expect(c.foo).to.be.true
            chai.expect(c.bar).to.be.true
            chai.expect(c.foobar).to.be.true
        })
    })

    describe("[class].isImplementedBy", function(){
        it("should compare an object with a class, and return true if the objetcs inherits or implements the class in a compatible fashion", function(){
            var A = klass({
                fna: { enumerable: true, value: function(){} }
              , fnb: { enumerable: true, configurable: true, value: function(){} }
            })

            var a = new A
            var b = { fna: A.prototype.fna, fnb: function(){} }
            var c = { fna: function(){}, fnb: function(){} }

            chai.expect(A.isImplementedBy(a)).to.be.true
            chai.expect(A.isImplementedBy(b)).to.be.true
            chai.expect(A.isImplementedBy(c)).to.be.false
        })
    })

    describe("instanceof Class", () => {
        it("should compare an object with a class, and return true if the objetcs inherits or implements the class in a compatible fashion", () => {
            var A = klass({
                fna: { enumerable: true, value: function(){} }
              , fnb: { enumerable: true, configurable: true, value: function(){} }
            })

            var a = new A
            var b = { fna: A.prototype.fna, fnb: function(){} }
            var c = { fna: function(){}, fnb: function(){} }

            chai.expect(a instanceof A).to.be.true
            chai.expect(b instanceof A).to.be.true
            chai.expect(c instanceof A).to.be.false

        })
    })

})
