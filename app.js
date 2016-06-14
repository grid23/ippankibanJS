"use strict"

const exec = require("child_process").exec
const fork = require("child_process").fork
const fs = require("fs")
const path = require("path")

const IGNORE = [".DS_Store"]
const PATH_ROOT = path.resolve(process.cwd(), __dirname)

Promise.all([
    new Promise((resolve, reject) => {
        const mandatory = ["--es_staging", "--harmony-proxies", "--strong_this"]
        const ok = mandatory
                    .map(v => process.execArgv.indexOf(v) > -1)
                    .reduce((v, cv) => !cv ? cv : v)

        if ( !!ok )
          return resolve()

        let cp = fork(__filename, process.argv.slice(2), {
            execArgv: mandatory
        })

        process.on("SIGINT", () => cp.kill())
        process.on("SIGTERM", () => cp.kill())
        process.on("exit", () => cp.kill())
        cp.on("SIGINT", () => process.exit() )
        cp.on("SIGTERM", () => process.exit() )
        cp.on("exit", () => process.exit() )

        reject()
    })
])
.then(()=>{
    return new Promise(resolve => {
        process.setMaxListeners(1000)
        process.on("SIGINT", e => process.exit())
        process.on("SIGTERM", e => process.exit())

        resolve()
    })
})
.then(() => {
    const onfatalerror = error => {
        console.log(`\nfatal error:\n${error.message}\n`)
        process.exit()
    }

    const PATH_CLIENT = path.join(PATH_ROOT, "./www/client")
    const PATH_SERVER = path.join(PATH_ROOT, "./www/server")

    const mandatories = () => {
        const mandatories = []

        return new Promise((resolve, reject) => {
            mandatories.forEach(mandatory => {
                try {
                    if ( !fs.statSync(path.join(PATH_ROOT, mandatory)).isDirectory() )
                      throw new Error(`directory ${mandatory} does not exist`)
                } catch(e) {
                    console.log(`directory ${mandatory} will be created (0777)`)
                      fs.mkdirSync(path.join(PATH_ROOT, mandatory))
                }
            })

            resolve()
        })
    }

    const start_clients = () => {
        return new Promise((resolve, reject) => {
            fs.readdir(PATH_CLIENT, (error, _files) => {
                if (error)
                  return onfatalerror(error)

                const files = _files.filter(file => IGNORE.indexOf(file) == -1 && fs.statSync(path.join(PATH_CLIENT, file)).isFile() )

                files.forEach(file => {
                    const cp = fork(path.join(PATH_CLIENT, file), process.argv.slice(2), { execArgv: process.execArgv })
                    const pid = cp.pid
                    process.on("exit", e => exec(`kill -9 ${pid}`))
                })

                resolve()
            })
        })
    }

    const start_servers = () => {
        return new Promise((resolve, reject) => {
            fs.readdir(PATH_SERVER, (error, _files) => {
                if (error)
                  return onfatalerror(error)

                const files = _files.filter(file => IGNORE.indexOf(file) == -1 && fs.statSync(path.join(PATH_SERVER, file)).isFile() )

                files.forEach(file => {
                    const cp = fork(path.join(PATH_SERVER, file), process.argv.slice(2), { execArgv: process.execArgv })
                    const pid = cp.pid
                    process.on("exit", e => exec(`kill -9 ${pid}`))
                })

                resolve()
            })
        })
    }

      mandatories()
        .then(start_clients)
        .then(start_servers)
})
