"use strict"

const native = require("./native").native

module.exports.type =
module.exports.typeOf =
module.exports.typeof = o => {
    if ( Array.isArray(o) )
      return "array"

    const ntype = typeof o
    return ntype !== "object" ? ( o === o ? ntype : "nan" )
         : o && o.constructor && !native(o.constructor) ? "instance"
         : o && typeof o.prototype == "function" ? "function"
         : Object.prototype.toString.call(o).slice(8, - 1).toLowerCase()
}
