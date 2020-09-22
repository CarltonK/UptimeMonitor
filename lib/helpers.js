/*
Helpers for various tasks
*/

// Dependencies
const crypto = require('crypto')
const config = require('./config')

// Container for all the helpers
let helpers = {}

// Create a SHA256 hash
helpers.hash = function(str) {
    if (typeof(str) == 'string' && str.length > 0) {
        const hash = crypto.createHmac('sha256',config.hashingSecret).update(str).digest('hex')
        return hash
    }
    else {
        return false
    }
}

// Create a function that takes in an arbitrary string and returns a JsonObject
helpers.parseJsonToObject = function(str) {
    try {
        const obj = JSON.parse(str)
        return obj
    } catch (error) {
        return {}
    }
}


module.exports = helpers