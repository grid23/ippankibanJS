"use strict"

const fs = require("fs")
const path = require("path")

const Mocha = require("mocha")

const PATH = path.resolve(process.cwd(), __dirname)
const IGNORE_FILENAME = [".DS_Store"]


fs.readdir(PATH, (err, files) => {
    if ( err )
      throw err

    const mocha = new Mocha({ reporter: "list" })

    files
    .filter( file => path.extname(file) == ".js" && file !== "index.js"  )
    .forEach( file => mocha.addFile(path.join(PATH, file)) )

    mocha.run(failures => {
        process.on("exit", e => {
            process.exit(failures)
        })
    })
})
