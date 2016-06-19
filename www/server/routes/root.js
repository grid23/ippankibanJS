"use strict"

const fs = require("fs")
const path = require("path")

const IGNORE = [".DS_STORE"]
const PATH_ROOT = path.resolve(process.cwd(), __dirname)
const PATH_SPECS = path.join(PATH_ROOT, "../../../specs/browser")

const HTML = `<!doctype html>
<html dir=ltr>
  <meta charset=utf-8 />
  <title>browser specs</title>
  <link rel=stylesheet href=/css/mocha />
    <div id=mocha></div>
    <script src=/js/mocha></script>
    <script>mocha.setup("bdd")</script>
    <script src=/js/chai></script>
    <script src=/js/lib></script>`

module.exports.path = "^/$"
module.exports.handler = (request, response) => {
    new Promise((resolve, reject) => {
        fs.readdir(PATH_SPECS, (err, files)=>{
            let tpl = HTML

            files.forEach(file => {
                if ( IGNORE.indexOf(file) == -1 )
                  tpl += `\n    <script src=/specs/${file}></script>`
            })

            tpl += `\n    <script>mocha.run()</script>`
            resolve(tpl)
        })
    }).then(function(tpl){
        response.statusCode = 200
        response.setHeader("Content-Type", "text/HTML")
        response.end(tpl)
    })
}
