"use strict"

const jsdom = require("jsdom").jsdom

const gather = () => {
    const document = jsdom("<!doctype html>", {
          features: {
              FetchExternalResources: false
            , ProcessExternalResources: false
            , SkipExternalResources: true
          }
    })

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
    setTimeout(() => {
        resolve(gather())
    }, 4)
})
