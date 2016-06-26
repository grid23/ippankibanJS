"use strict"

const cancelAnimationFrame = require("../cancelAnimationFrame")
const cssProperties = window.getComputedStyle(document.createElement("div"))
const domready = require("../domready")
const isSameDomain = require("../isSameDomain").isSameDomain
const klass = require("../class").class
const requestAnimationFrame = require("../requestAnimationFrame")

const CSSRule = require("../CSSRule")
const Event = require("../Event").Event
const EventTarget = require("../EventTarget").EventTarget
const Serializer = require("../Serializer").Serializer
const UID = require("../UID").UID
const ZParser = require("../ZParser").ZParser

module.export.Stylesheet = klass(EventTarget, statics => {

    return {}
})
