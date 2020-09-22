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

// Create a string of random alphanumeric characters of a given length
helpers.createRandomString = function(strLength) {
    strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false
    if (strLength) {
        // Define all the possible characters that could go into a string
        const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789'

        // Start the final string
        let str = ''

        // Loop through the possible characters
        for (let index = 0; index < strLength; index++) {
            // Get a random character
            const randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length))
            // Append to string
            str += randomCharacter
            
        }

        // Return the final string
        return str
    } else {
        return false
    }
}


module.exports = helpers