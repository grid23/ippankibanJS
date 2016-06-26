"use strict"

const gather = () => {
    return {
        nodes: {
            documentElement: document.documentElement
          , head: document.head
          , title: function(){
              const node = document.head.getElementsByTagName("title")[0]

              if ( node )
                return node
              return document.head.appendChild(document.createElement("title"))
            }()
          , viewport: function(){
                let node = document.head.querySelector("meta[name=viewport]")

                if ( node )
                  return node

                node = document.createElement("meta")
                node.setAttribute("name", "viewport")
                node.setAttribute("content", "")

                return document.head.appendChild(node)
            }()
          , body: document.body
        }
    }
}

module.exports = new Promise((resolve, reject) => {
    let ready = false
    const onready = () => {
        if ( !document.body )
          return setTimeout(onready, 4)

        if ( ready )
          return
        ready = true

        setTimeout(() => {
            resolve(gather())
        }, 4)
    }

    const isready = () => {
        return "interactive, complete".indexOf(document.readyState) != -1 ? (onready(), true) : false
    }

    if ( !isready() )
      window.addEventListener("DOMContentLoaded", onready, true),
      window.addEventListener("load", onready, true),
      document.addEventListener("readystatechange", isready, true)
})
