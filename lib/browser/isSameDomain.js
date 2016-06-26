"use strict"

const dummy = document.createElement("a")
module.exports.isSameDomain = path => {
    dummy.href = path

    return dummy.hostname === location.hostname ? true
         : !dummy.hostname ? true // ie/edge doesn't set the hostname if not "necessary"
         : false
}
