"use strict"

const errors = require("./errors")
const native = require("./native").native
const type = require("./type").type

const getClassAndDescriptorsAndStatics = (descriptors, statics) => {
    statics = statics || Object.create(null)

    if ( type(descriptors) == "function" ) {
        descriptors = descriptors(statics)

        if ( typeof descriptors == "object" )
          return getClassAndDescriptorsAndStatics(descriptors, statics)
        throw new TypeError(errors.NO_CLASS_DESCRIPTOR_ERR)
    }

    descriptors.constructor = descriptors.hasOwnProperty("constructor") ? descriptors.constructor : function(){}

    let native_err
    let Class = type(descriptors.constructor) == "function" && (native_err = native(descriptors.constructor), !native_err) ? descriptors.constructor
              : type(descriptors.constructor.value) == "function" && (native_err = !native(descriptors.constructor.value), !native_err) ? descriptors.constructor.value
              : !!native_err ? function(){ throw new TypeError(errors.CONSTRUCTOR_NATIVE_ERR) }()
              : function(){}
    delete descriptors.constructor

    //Object.keys ?
    Object.getOwnPropertyNames(descriptors)
    .concat(Object.getOwnPropertySymbols(descriptors))
    .forEach(function(key){
        descriptors[key] = descriptors[key].constructor == Object
                           && ( descriptors[key].hasOwnProperty("value")
                           || descriptors[key].hasOwnProperty("get")
                           || descriptors[key].hasOwnProperty("set") )
                         ? descriptors[key]
                         : { configurable: true, enumerable: true, writable: true, value: descriptors[key] }
    })

    return { Class, descriptors: { prototype: Object.create(null, descriptors) }, statics}
}


module.exports.class = (...parents)=>{
    let prototype = Object.create({})
    let {Class, descriptors, statics} = getClassAndDescriptorsAndStatics(parents.pop())
    parents.push(descriptors)

    parents
      .forEach(parent => {
          Object.getOwnPropertyNames(parent.prototype)
          .concat(Object.getOwnPropertySymbols(parent.prototype))
          .forEach(property => {
              Object.defineProperty(prototype, property, Object.getOwnPropertyDescriptor(parent.prototype, property))
          })
      })

    Object.defineProperty(prototype, "constructor", { value: Class, configurable: true, enumerable: true  })
    Class.prototype = prototype

    Object.getOwnPropertyNames(statics)
      .forEach(property => {
          Object.defineProperty(Class, property, Object.getOwnPropertyDescriptor(statics, property))
      })

    !Class.hasOwnProperty("isImplementedBy") && Object.defineProperty(Class, "isImplementedBy", {
        enumerable: true,
        value: o => {
            if ( !o )
              return false

            let prototype = o && o.prototype ? o.prototype
                          : o && o.constructor == Object ? o
                          : typeof  o.constructor == "function" ? o.constructor.prototype
                          : null

            if ( o === Class || (o & o.constructor && o.constructor === Class) || Class.prototype === prototype )
              return true

            let keys = Object.getOwnPropertyNames(Class.prototype)

            for ( let i = 0, l = keys.length; i < l; i++ )
              if ( keys[i] != "constructor" && function(o, c){
                  let err = !o || !c ? true : false

                  if ( o )
                    if ( c.configurable ) {
                      if ( c.hasOwnProperty("value") && typeof o.value != typeof c.value )
                        err = true
                    } else {
                      if ( c.hasOwnProperty("value") && o.value !== c.value )
                        err = true
                      if ( c.hasOwnProperty("get") && o.get !== c.get )
                        err = true
                      if ( c.hasOwnProperty("set") && o.set !== c.set )
                        err = true
                    }

                  return err
              }( Object.getOwnPropertyDescriptor(prototype, keys[i]), Object.getOwnPropertyDescriptor(Class.prototype, keys[i]) ) ) return false

            return true
        }
    })

    !Class.hasOwnProperty(Symbol.hasInstance) && Object.defineProperty(Class, Symbol.hasInstance, {
        value: o => Class.isImplementedBy(o)
    })


    return Class
}

module.exports.singleton = function(F, G){
    F = module.exports.class.apply(null, arguments)
    G = module.exports.class.call(null, F, (statics, k) => {

        Object.getOwnPropertyNames(F)
          .forEach(property => {
              Object.defineProperty(statics, property, Object.getOwnPropertyDescriptor(F, property))
          })

        return {
            constructor: function(){
                if ( G.instance )
                  return G.instance
                G.instance = this

                return F.apply(this, arguments)
            }
        }
    })

  return G
}
