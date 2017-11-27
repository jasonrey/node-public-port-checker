#!/usr/bin/env node

const { version } = require('../package.json')
const program = require('commander')
const http = require('http')
const crypto = require('crypto')
const parsePort = require('../utilities/parsePort')

let port

program
  .version(version)
  .usage('<port> [options]')
  .arguments('<value>')
  .action(value => {
    port = value
  })
  .option('-k, --key [key]', 'Secret key to verify from the server side.')

program.on('--help', () => {
  console.log()
  console.log('  <port>')
  console.log('    Port is comma separated. Support dashes for range.')
})

program.parse(process.argv)

try {
  if (!port) {
    throw new Error('Please specify ports to scan.')
  }

  const ports = parsePort(port)

  Promise.all(
    ports.map(port => {
      return new Promise((resolve, reject) => {
        let result = {
          listening: true,
          message: null,
          port
        }

        let hash
        let hashedPort = crypto.createHash('sha256').update(port.toString()).digest('hex')

        if (program.key) {
          hash = crypto.createHash('sha256').update(`${program.key}:${port}`).digest('hex')
        }

        const server = http.createServer((req, res) => {
          if (hash && (!req.headers['x-secret-key'] || req.headers['x-secret-key'] !== hash)) {
            res.statusCode = 400
            return res.end()
          }

          res.write(hashedPort)
          return res.end()
        })

        server.on('error', err => {
          result.message = err.message
          result.listening = false

          resolve(result)
        })

        server.listen(port, () => {
          resolve(result)
        })
      })
    })
  )
    .then(results => {
      results.map(result => {
        console.log(`${result.port} => ${result.listening ? 'Listening' : 'Error'}${result.message ? ' : ' + result.message : ''}`)
      })
    })
} catch (err) {
  console.error(err.message)
}
