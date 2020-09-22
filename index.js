/*
Primary file for API
*/

//Dependencies
const http = require('http')
const https = require('https')
const url = require('url')
const StringDecoder = require('string_decoder').StringDecoder
const config = require('./lib/config')
const fs = require('fs')
const handlers = require('./lib/handlers')
const helpers = require('./lib/helpers')

// Server Operations

// Instantiate the HTTP server
const httpServer = http.createServer(function(req, res) {
    umbrellaServer(req, res)
})

// Start the HTTP server
httpServer.listen(config.httpPort, function() {
    console.log(`The server is listening on port ${config.httpPort} in the ${config.envName} environment`)
})

// Instantiate the HTTP server
httpsServerOptions = {
    key: fs.readFileSync('./https/key.pem'),
    cert: fs.readFileSync('./https/cert.pem')
}
const httpsServer = https.createServer(httpsServerOptions, function(req, res) {
    umbrellaServer(req, res)
})

// Start the HTTPS server
httpsServer.listen(config.httpsPort, function() {
    console.log(`The server is listening on port ${config.httpsPort} in the ${config.envName} environment`)
})

// Umbrella Server
const umbrellaServer = function(req, res) {
    // Get the URL and parse it
    const parsedUrl = url.parse(req.url, true)

    // Get the path
    const path  = parsedUrl.pathname
    const trimmedPath = path.replace(/^\/+|\/+$/g,'')

    // Get the HTTP Method
    const method = req.method.toLowerCase()

    // Get the query string as an object
    const queryStringObject = parsedUrl.query

    // Get the headers as an object
    const headers = req.headers

    // Get the payload, if any
    const decoder = new StringDecoder('utf-8')
    let buffer = ''
    req.on('data', function(data) {
        buffer += decoder.write(data)
    })
    req.on('end', function() {
        buffer += decoder.end()

        // Choose the handler this requests go to
        // If not found use the notFound handler
        let chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound

        const data = {
            trimmedPath: trimmedPath,
            queryStringObject: queryStringObject,
            method: method,
            headers: headers,
            payload: helpers.parseJsonToObject(buffer)
        }

        // Route the request to the specified handler
        chosenHandler(data, function(statusCode, payload) {
            // Use status code called back by the handler or default to 200
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200

            // Use the payload called back by handler or default to an empty object
            payload = typeof(payload) == 'object' ? payload : {}

            // Convert the payload to a string
            const payloadString = JSON.stringify(payload)

            // Return the response
            res.setHeader('Content-Type','application/json')
            res.writeHead(statusCode)
            res.end(payloadString)

            // Logs
            console.log('Response: ', statusCode, payloadString)
        })
    })
}

// Define a router
const router  = {
    'ping': handlers.ping,
    'users': handlers.users,
}