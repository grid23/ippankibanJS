"use strict"

const Model = require("../lib/Model").Model

const a = new Model({ foo: "bar" }, (err) => {
    console.log("written", err)
})

a.addEventListener("busy", e => {
    console.log("model busy")
})

a.addEventListener("idle", e => {
    console.log("model idle")
})

a.read("foo", (err, {foo}={}) => {
    console.log(err, foo)
})
