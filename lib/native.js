"use strict"

const known_exceptions = ["[object CSSMediaRule]"]
const rnative = /\s*\[native code\]\s*/i

module.exports.native = fn => {
    try {
        let toString = fn.toString() || ""
        return typeof fn == "function" ? !!toString.match(rnative)
             : known_exceptions.indexOf(toString) > -1 ? true
             : false
    } catch(e){
        return null
    }
}
