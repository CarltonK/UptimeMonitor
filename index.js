/*
Primary file for API
*/

//Dependencies
const http = require('http')
const { StringDecoder } = require('string_decoder')
const url = require('url')
const stringDecorder = require('string_decoder').StringDecoder

// Server Operations

// 1) Respond to all requests
const server = http.createServer(function(req, res) {

    // Get the URL and parse it
    const parsedUrl = url.parse(req.url, true)

    // Get the path
    const path  = parsedUrl.pathname
    const trimmedPath = path.replace(/^\/+|\/+$/g,'')

    // Get the HTTP Method
    const method = req.method.toUpperCase()

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

        // Send the response
        res.end('Hello World')

        // Logs
        console.log('\n---XXX---NEW REQUEST---XXX---')
        console.log(`Trimmed Path: ${trimmedPath}`)
        console.log(`Method: ${method}`)
        console.log('Parameters: ',queryStringObject)
        console.log('Headers: ',headers)
        console.log('Payload: ',buffer)
        console.log('---XXX---END REQUEST---XXX---\n')
    })
})

// 2) Start the server and listen on PORT 3000
server.listen(3000, function() {
    console.log('The server is listening on port 3000')
})