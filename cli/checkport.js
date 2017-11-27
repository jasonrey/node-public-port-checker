#!/usr/bin/env node

const { version } = require('../package.json')
const program = require('commander')
const request = require('request-promise-native')
const crypto = require('crypto')
const parsePort = require('../utilities/parsePort')

let hostname
let port

program
  .version(version)
  .usage('<hostname>:<port> [options]')
  .arguments('<value>')
  .action(value => {
    [hostname, port] = value.split(':')
  })
  .option('-k, --key [key]', 'Secret key to verify from the server side.')
  .option('-t, --timeout [milisecond]', 'Specify timeout for connection.', 3000)
  .option('-c, --close-only', 'List closed only ports.')

program.on('--help', () => {
  console.log()
  console.log('  <port>')
  console.log('    Port is comma separated. Support dashes for range.')
})

program.parse(process.argv)

try {
  if (!hostname) {
    throw new Error('Specify a hostname.')
  }

  if (!port) {
    throw new Error('Please specify ports to scan.')
  }

  const ports = parsePort(port)

  Promise.all(
    ports
      .map(async port => {
        const headers = {}

        if (program.key) {
          headers['x-secret-key'] = crypto.createHash('sha256').update(`${program.key}:${port}`).digest('hex')
        }

        const result = {
          port,
          state: 'true',
          message: null
        }

        let response

        try {
          response = await request({
            url: `http://${hostname}:${port}`,
            headers,
            timeout: program.timeout
          })

          if (response !== crypto.createHash('sha256').update(port.toString()).digest('hex')) {
            throw new Error(`Invalid response: ${response}`)
          }
        } catch (err) {
          result.state = false
          result.message = err.message
        }

        return result
      })
  )
    .then(results => {
      results
        .filter(result => !program.closeOnly || (program.closeOnly && !result.state))
        .map(result => {
          console.log(`${result.port} => ${result.state ? 'Open' : 'Close'}${result.message ? ' : ' + result.message : ''}`)
        })
    })
} catch (err) {
  console.error(err.message)
}
