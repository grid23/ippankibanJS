"use strict"

const errors = require("../errors")
const klass = require("../class").class
const typeOf = require("../type").typeof

const Event = require("../Event").Event
const LibNode = require("../Node").Node
const Model = require("../Model").Model

const jsdom = require("jsdom").jsdom
const document = jsdom("<!doctype html>", {
      features: {
          FetchExternalResources: false
        , ProcessExternalResources: false
        , SkipExternalResources: true
      }
})
const window = document.defaultView
const requestAnimationFrame = process.nextTick

const Element = window.Element
const HTMLElement = window.HTMLElement
const Node = window.Node

module.exports.document = document
module.exports.window = window

/* ------------ */

const CLASS_LIST_COMPAT = (Element.prototype.hasOwnProperty("classList") || HTMLElement.prototype.hasOwnProperty("classList")) && function(){
    // to be compatible, browser must be able to use classlist on a svg element
    try {
        document.createElementNS("http://www.w3.org/2000/svg", "svg").classList.add("x")
        return true
    } catch(e){}
    return false
}()

const namespaces = {
    html: "http://www.w3.org/1999/xhtml"
  , svg: "http://www.w3.org/2000/svg"
  , xml: "http://www.w3.org/XML/1998/namespace"
  , xmlns: "http://www.w3.org/2000/xmlns/"
  , xlink: "http://www.w3.org/1999/xlink"
}

module.exports.ZExpression = klass(statics => {
    const expressions = new WeakMap
    const registered = new Map

    Object.defineProperties(statics, {
        registered: { enumerable: true,
            value: (name, parser) => {
                let hit = registered.has(name) ? registered.get(name) : null

                if ( hit && (!parser || (!!parser && hit.parser === parser)) )
                  return hit.exp
            }
        }
    })

    return {
        constructor: function(expression = "div"){
            expressions.set(this, Object.create(null))
            expressions.get(this).string = expression
        }
      , registerAs: { enumerable: true,
            value: function(name, parser){
                if ( registered.has(name) )
                  throw new Error(errors.TEMPLATE_NAME_ALREADY_IN_USE) //TODO

                registered.set(name, {exp:this, parser:parser})
            }
        }
      , string: { enumerable: true,
            get: function(){ return expressions.get(this).string }
        }
      , [Symbol.iterator]: { enumerable: false,
            value: function*(){
                for ( let char of this.string )
                  yield char
            }
        }
    }
})

module.exports.ZParser = klass(statics => {
    const auto_vars = ["A", "INPUT", "SUBMIT", "BUTTON"]
    const operators = new Map
    const traversals = new Map

    const rtemplatevars = /(\$|£)([^$£\s]*)/g
    const templateVarGlyph = "\\$"
    const unsafetemplateVarGlyph = "£"

    const escapeHTML = function(){
        const dummy = document.createTextNode("")

        return str => {
            dummy.nodeValue = str
            return dummy.nodeValue
        }
    }()

    operators.set("[", {
        name: "attribute"
      , endAt: "]"
      , set: (node, key, value) => {
            let split = escapeHTML(key).split(":")
            let ns = split.length > 1 && !!namespaces[split[0].toLowerCase()] ? namespaces[split.shift().toLowerCase()] : null
            key = split.join(":")

            if ( ns )
              node.setAttributeNS(ns, key, escapeHTML(value))
            else
              node.setAttribute(key, escapeHTML(value))

        }
      , handler: (stream, input, output) => {
            if ( !input.buffer || input.buffer.nodeType !== Node.ELEMENT_NODE )
              return

            let node = input.buffer
            let vars = []

            let pair = input.pile
            let idx = pair.search("=")

            let attr = idx == -1 ? pair : pair.split("=")[0]
            let value = idx == -1 ? true : pair.slice(idx+1)

            let hit
            while ( hit = (rtemplatevars.exec(value)||[])[2], hit )
              if ( vars.indexOf(hit) == -1 )
                vars.push(hit)

            if ( vars.length ) {
                vars.forEach(key => {
                    input.vars.add(key)
                    input.updates.add(keys => {
                        if ( !keys.hasOwnProperty(key) )
                          return

                        operators.get("[").set(node, attr, keys[key])
                    })
                })
            } else {
                operators.get("[").set(node, attr, value)
            }
        }
    })

    operators.set(".", {
        name: "classname"
      , set: (node, className, replaced) => {
            if ( CLASS_LIST_COMPAT ) {
                let classNames = className.split(" ")

                if ( !!replaced ) {
                    let replacedClasses = replacedClass.split(" ")

                    replacedClasses.forEach(className => classNames.forEach( className => node.classList.remove(escapeHTML(className)) ))
                }

                classNames.forEach( className => node.classList.add(escapeHTML(className)) )
            } else {
                if ( !!replaced )
                  node.setAttribute("class", node.getAttribute("class").replaced(" "+escapeHTML(replaced), function(){ return " "+module.exports.ZParser.escapeHTML(className) }))
                else
                  node.setAttribute("class", (node.getAttribute("class")||"")+ " "+escapeHTML(className))
            }
        }
      , handler: (stream, input, output) => {
            if ( !input.buffer || input.buffer.nodeType !== Node.ELEMENT_NODE )
              return

            let node = input.buffer
            let className = input.pile
            let vars = []

            let hit
            while ( hit = (rtemplatevars.exec(className)||[])[2], hit )
              if ( vars.indexOf(hit) == -1 )
                vars.push(hit)

            if ( vars.length ) {
                vars.forEach(key => {
                    let curr

                    input.vars.add(key)
                    input.updates.add(keys => {
                        if ( !keys.hasOwnProperty(key) )
                          return

                        operators.get(".").set(node, keys[key], curr)
                        curr = keys[key]
                    })
                })
            } else {
                operators.get(".").set(node, className)
            }
        }
    })

    operators.set("{", {
        name: "content"
      , endAt: "}"
      , set: (node, value, unsafe) => {
            if ( node.nodeType == Node.TEXT_NODE )
              node.nodeValue = value
            else if ( unsafe )
              node.innerHTML = value
            else
              node.textContent = escapeHTML(value)
        }
      , handler: (stream, input, output) => {
            if ( !input.buffer )
              return

            let node = input.buffer
            let textContent = input.pile
            let vars = textContent.match(rtemplatevars)

            if ( vars && vars.length >= 1) {
                let remainder = textContent

                while ( vars.length ) {
                    let caught = vars.shift()
                    let type = caught[0]
                    let key = caught.slice(1)

                    let idx = remainder.indexOf(caught)
                    let before = remainder.slice(0, idx)
                    remainder = remainder.slice(idx+caught.length)

                    if ( before.length ) {
                        let text_node = document.createTextNode(before)
                        node.appendChild(text_node)
                    }

                    let text_node = document.createTextNode(caught)
                    node.appendChild(text_node)

                    if ( type == unsafetemplateVarGlyph )
                      console.warn(errors.WARN_UNSAFE_TPL) //TODO

                    input.vars.add(key)
                    input.updates.add(keys=>{
                        if ( !keys.hasOwnProperty(key) )
                          return

                        operators.get("{").set(text_node, keys[key])
                    })
                }
            } else if (vars && vars.length == 1 ){
                  let caught = vars.shift()
                  let type = caught[0]
                  let key = caught.slice(1)

                  input.vars.add(key)

                  if ( type !== unsafetemplateVarGlyph ) {
                      let text_node = document.createTextNode(caught)
                      node.appendChild(text_node)

                      input.updates.add(keys=>{
                          if ( !keys.hasOwnProperty(key) )
                            return

                          operators.get("{").set(text_node, keys[key])
                      })
                  } else {
                      operators.get("{").set(node, caught, true)
                      input.updates.add(keys=>{
                          if ( !keys.hasOwnProperty(key) )
                            return

                          operators.get("{").set(node, keys[key], true)
                      })
                  }
            } else {
                operators.get("{").set(node, textContent)
            }
        }
    })

    operators.set("(", {
        name: "group"
      , endAt: ")"
      , handler: (stream, input, output) => {
            let sub = module.exports.ZParser.parse(input.pile, input.model)
            let tree = sub.tree

            Object.keys(sub.refs).forEach(key => {
                if ( key == "root" )
                  return

                input.refs[key] = input.refs[key] || new Set
                sub.refs[key].forEach(node => input.refs[key].add(node))
            })

            sub.vars.forEach(key => input.vars.add(key))
            sub.updates.forEach(fn => input.updates.add(fn))

            input.buffer = tree
        }
    })

    operators.set("#", {
        name: "id"
      , set: (node, id) => {
            node.setAttribute("id", escapeHTML(id))
        }
      , handler: (stream, input, output) => {
            if ( !input.buffer || input.buffer.nodeType !== Node.ELEMENT_NODE )
              return

            let node = input.buffer
            let id = input.pile
            let vars = []

            let hit
            while ( hit = (rtemplatevars.exec(id)||[])[2], hit )
              if ( vars.indexOf(hit) == -1 )
                vars.push(hit)

            if ( vars.length ) {
                vars.forEach(key => {
                    input.vars.add(key)
                    input.updates.add(keys => {
                        if ( !keys.hasOwnProperty(key) )
                          return

                        operators.get("#").set(node, keys[key])
                    })
                })
            } else {
                operators.get("#").set(node, id)
            }
        }
    })

    /*
    operators.set("*", {
        name: "multiply"
      , handler: (stream, input, output) => {
            let nbr = input.pile |0

            console.warn("experimental feature, do not use")
        }
    })
    */

    operators.set("@", {
        name: "reference"
      , handler: (stream, input, output) => {
            if ( !input.buffer || input.buffer.nodeType !== Node.ELEMENT_NODE )
              return

            let ref = input.pile || input.buffer.nodeName.toLowerCase()

            input.refs[ref] = input.refs[ref] || new Set
            input.refs[ref].add(input.buffer)
        }
    })

    traversals.set(">", {
        name: "child"
      , handler: (stream, input, output) => {
            input.context.appendChild(input.buffer)

            input.buffer = input.context.childNodes[input.context.childNodes.length-1]
        }
    })

    traversals.set("^", {
        name: "climb up"
      , handler: (stream, input, output) => {
            input.context = input.context.parentNode || input.context
            traversals.get("+").handler(stream, input, output)
        }
    })

    traversals.set("+", {
        name: "sibling"
      , handler: (stream, input, output) => {
            input.context.parentNode.appendChild(input.buffer)

            input.buffer = input.context.parentNode.childNodes[input.context.parentNode.childNodes.length-1]
        }
    })


    const operate = (stream, input, output) => {
        input.pile = input.pile.trim()

        if ( !input.operator ) {
            let split

            input.buffer = !input.pile.length && input.glyph === "{" ? document.createTextNode("")
                         : !input.pile.length && input.glyph !== "{" ? document.createElement("div")
                         : input.pile === "§" ? document.createTextNode("")
                         : input.pile[0] === "&" && module.exports.ZExpression.registered(input.pile.slice(1)) ? function(){
                                let sub = input.parser.parse(module.exports.ZExpression.registered(input.pile.slice(1), this), input.model)
                                let tree = sub.tree

                                Object.keys(sub.refs).forEach(key => {
                                    if ( key == "root" )
                                      return

                                    input.refs[key] = input.refs[key] || new Set
                                    sub.refs[key].forEach(node => input.refs[key].add(node))
                                })

                                sub.vars.forEach(key => input.vars.add(key))
                                sub.updates.forEach(fn => input.updates.add(fn))

                                return tree
                           }()
                         : input.pile.indexOf(":") == -1 ? document.createElement(input.pile)
                         : (split = input.pile.split(":"), document.createElementNS(namespaces[split[0].toLowerCase()]||namespaces.hmtl, split[1]))

            if ( auto_vars.indexOf(input.buffer.nodeName) != -1 ) {
                input.pile = input.buffer.nodeName.toLowerCase()
                operators.get("@").handler(stream, input, output)
            }
        } else operators.get(input.operator).handler(stream, input, output)

        input.pile = ""
        input.operator = input.glyph
    }

    const parse = (stream, input, output) => {
        let capture = null

        let current
        while ( current = stream.next(), !current.done ) {
            input.glyph = current.value

            if ( !capture) {
                if ( traversals.has(input.glyph) )
                    traverse(stream, input, output)
                else if ( operators.has(input.glyph) ) {
                    operate(stream, input, output)

                    if ( !!operators.get(input.glyph).endAt ) {
                        capture = { start: input.glyph, end: operators.get(input.glyph).endAt, ignore: 0  }
                    }
                }
                else
                    input.pile += input.glyph
            } else {
                if ( input.glyph == capture.end && !capture.ignore )
                  capture = null
                else {
                    if ( input.glyph == capture.end )
                      capture.ignore += -1
                    else if ( input.glyph == capture.start )
                      capture.ignore += 1

                    input.pile += input.glyph
                }
            }
        }

        traverse(stream, input, output)

        input.refs.root = input.refs.root || new Set
        Array.prototype.slice.call(output.tree.childNodes).forEach(node => input.refs.root.add(node))

        if ( input.updates.size )
          output.update()
        return output
    }

    const traverse = (stream, input, output) => {
        operate(stream, input, output)

        if ( !input.traversal )
            input.context = (input.tree.appendChild(input.buffer), input.tree.childNodes[input.tree.childNodes.length-1])
        else
            traversals.get(input.traversal).handler(stream, input, output)
        input.traversal = input.glyph

        input.pile = ""
        input.glyph = ""
        input.operator = null

        if ( input.buffer && input.buffer.nodeType === Node.ELEMENT_NODE )
          input.context = input.buffer
        input.buffer = null
    }

    Object.defineProperties(statics, {
        parse: { enumerable: true,
            value: (...args) => {
                let parser = new module.exports.ZParser

                return parser.parse.apply(parser, args)
            }
        }
    })

    return {
        parse: { enumerable: true,
            value: function(expression = "", model = {}, ...models){
                if ( !module.exports.ZExpression.isImplementedBy(expression) )
                  expression = new module.exports.ZExpression(expression)

                if ( !Model.isImplementedBy(model) )
                  model = new Model(model)

                let stream = expression[Symbol.iterator]()

                let refs = {}
                let tree = document.createDocumentFragment()
                let updates = new Set
                let vars = new Set

                let input = { context: null, glyph: "", model, operator: "", parser: this, pile: "", refs, traversal: "", tree, updates,  vars }
                let output = new ZTemplate(model, tree, refs, updates, vars)

                return parse(stream, input, output)
            }
        }
    }
})


const ReadyEvt = klass(Event, {
    constructor: function(){
        Event.call(this, "ready")
    }
})

const ZTemplate = klass(LibNode, statics => {
    const ztemplates = new WeakMap

    return {
        constructor: function(model, tree, refs, updates, vars){
            LibNode.call(this)

            ztemplates.set(this, Object.create(null))
            ztemplates.get(this).model = model || new Model
            ztemplates.get(this).refs = refs
            ztemplates.get(this).ready = false
            ztemplates.get(this).tree = tree
            ztemplates.get(this).updates = updates
            ztemplates.get(this).vars = vars

            const onupdate = e => {
                let keys = e.keys.filter(key => ztemplates.get(this).vars.has(key) )

                if ( keys.length )
                  this.update(keys)
            }
            ztemplates.get(this).model.addEventListener("treechange", e => {
                if ( e.target !== ztemplates.get(this).model )
                  return

                onupdate(e)
            })
            ztemplates.get(this).model.addEventListener("update", onupdate)

            requestAnimationFrame(ts=>{
                if ( !ztemplates.get(this).updates.size )
                  if ( !ztemplates.get(this).ready )
                    ztemplates.get(this).ready = true,
                    this.dispatchEvent(new ReadyEvt)
            })
        }
      , model: { enumerable: true,
            get: function(){ return ztemplates.get(this).model }
        }
      , reference: { enumerable: true,
            get: function(){ return ztemplates.get(this).refs }
        }
      , refs: { enumerable: true,
            get: function(){ return ztemplates.get(this).refs }
        }
      , tree: { enumerable: true,
            get: function(){ return ztemplates.get(this).tree }
        }
      , update: { enumerable: true,
            value: function(...args){
                let cb = typeOf(args[args.length-1]) == "function" ? args.pop() : null
                let keys = typeOf(args[0]) == "array" ? args.shift()
                         : args[0] instanceof Set ? [...args.shift()]
                         : this.vars

                return new Promise((resolve, reject) => {
                    if ( keys.length )
                      this.model.read(keys, (err, data) => {
                          if ( err ) {
                              if ( cb ) cb(err)
                              return reject(err)
                          }

                          this.updates.forEach(fn=>{
                              fn(data)
                          })

                          this.dispatchEvent("update")

                          if ( !ztemplates.get(this).ready )
                            ztemplates.get(this).ready = true,
                            this.dispatchEvent(new ReadyEvt)

                          if ( cb ) cb(null)
                          return resolve()
                      })
                    else {
                        if ( cb ) cb(null)
                        return resolve()
                    }

                })
            }
        }
      , updates: { enumerable: true,
            get: function(){ return [...ztemplates.get(this).updates] }
        }
      , vars: { enumerable: true,
            get: function(){ return [...ztemplates.get(this).vars] }
        }
    }
})
