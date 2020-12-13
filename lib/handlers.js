/*
Request Handlers
*/

const config = require('./config')
const _data = require('./data')
const helpers = require('./helpers')

// Define handlers
let handlers = {}

// Users handler
handlers.users = function(data, callback) {
    let acceptableMethods = ['post','get','put','delete']
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback)
    } else {
        callback(405)
    }
}

// Containers for users submethods
handlers._users = {}

// Users -> post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = function(data, callback) {
    // Check that all required fields are filled out
    const firstName = (typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0) ? data.payload.firstName.trim() : false
    const lastName = (typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0) ? data.payload.lastName.trim() : false
    const phone = (typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10) ? data.payload.phone.trim() : false
    const password = (typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0) ? data.payload.password.trim() : false
    const tosAgreement = (typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true) ? true : false

    if (firstName && lastName && phone && password && tosAgreement) {
        // make sure that user doesn't exist
        _data.read('users',phone,function(err, data) {
            if (err) {
                // Hash the password
                const hashedPassword = helpers.hash(password)

                if (hashedPassword) {
                    // Create the user object
                    const userObject = {
                        firstName: firstName,
                        lastName: lastName,
                        phone: phone,
                        hashedPassword: hashedPassword,
                        tosAgreement: true
                    }

                    // Store the user
                    _data.create('users',phone,userObject,function(err) {
                        if (!err) {
                            callback(200)
                        } else {
                            console.log(err)
                            callback(500,{'Error': `Could not create the new user because ${err}`})
                        }
                    })
                } else {
                    callback(500, {'Error': 'Could not hash the user\'s password'})
                }
            } else {
                //User already exists
                callback(400, {'Error': 'A user with that phone number already exists'})
            }
        })
    } else {
        callback(400,{'Error': 'Required fields are missing'})
    }
}

// Users -> get
// Required data: phone
// Optional data: none
handlers._users.get = function(data, callback) {
    // Check that phone number is valid
    const phone = (typeof(data.queryStringObject.phone) == "string" && data.queryStringObject.phone.trim().length == 10) ? data.queryStringObject.phone.trim() : false
    if (phone) {
        // Get the token from the headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false
        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token, phone, function(isTokenValid) {
            if (isTokenValid) {
                // Lookup the user
                _data.read('users',phone, function(err, data) {
                    if (!err && data) {
                        // Remove hashed password from user object before returning it
                        delete data.hashedPassword
                        callback(200, data)
                    } else {
                        callback(404)
                    }
                })
            } else {
                callback(403, {'Error': 'Missing required token in header or token is invalid'})
            }
        })

    } else {
        callback(400,{'Error': 'Missing required field'})
    }
}

// Users -> put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
handlers._users.put = function(data, callback) {
    // Check that phone number is valid
    const phone = (typeof(data.payload.phone) == "string" && data.payload.phone.trim().length == 10) ? data.payload.phone.trim() : false
    
    // Check for optional fields
    const firstName = (typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0) ? data.payload.firstName.trim() : false
    const lastName = (typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0) ? data.payload.lastName.trim() : false
    const password = (typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0) ? data.payload.password.trim() : false

    // Error if the phone is invalid
    if (phone) {
        // Error if nothing is sent
        if (firstName || lastName || password) {
            // Get the token from the headers
            const token = typeof(data.headers.token) == 'string' ? data.headers.token : false
            // Verify that the given token is valid for the phone number
            handlers._tokens.verifyToken(token, phone, function(isTokenValid) {
                if (isTokenValid) {
                    _data.read('users', phone, function(err, userData) {
                        if (!err && userData) {
                            // Update necessary fields
                            if (firstName) {
                                userData.firstName = firstName
                            }
                            if (lastName) {
                                userData.lastName = lastName
                            }
                            if (password) {
                                userData.hashedPassword = helpers.hash(password)
                            }
        
                            // Store the new updates
                            _data.update('users', phone, userData, function(err) {
                                if (!err) {
                                    callback(200)
                                } else {
                                    console.log(err)
                                    callback(500,{'Error': 'Could not update the user'})
                                }
                            })
                        } else {
                            callback(400, {'Error': 'The specified user does not exists'})
                        }
                    })
                } else {
                    callback(403, {'Error': 'Missing required token in header or token is invalid'})
                }
            })
        } else {
            callback(400,{'Error': 'Missing fields to update'})
        }
    } else {
        callback(400,{'Error': 'The phone number is missing'})
    }

}

// Users -> delete
// Required fields: phone
handlers._users.delete = function(data, callback) {
    // Check that phone number is valid
    const phone = (typeof(data.queryStringObject.phone) == "string" && data.queryStringObject.phone.trim().length == 10) ? data.queryStringObject.phone.trim() : false
    if (phone) {

        // Get the token from the headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false
        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token, phone, function(isTokenValid) {
            if (isTokenValid) {
                // Lookup the user
                _data.read('users',phone, function(err, userData) {
                    if (!err && userData) {
                        _data.delete('users', phone, function(err) {
                            if (!err) {
                                // Delete the checks associated with the user
                                const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []
                                const checksToDelete = userChecks.length

                                if (checksToDelete > 0) {
                                    let checksDeleted = 0
                                    let deletionError = false
                                    // Look through the checks
                                    userChecks.forEach(function(checkId) {
                                        // Delete the check
                                        _data.delete('checks', checkId, function(err) {
                                            if (err) {
                                                deletionError = true
                                            } else {
                                                checksDeleted ++
                                                if (checksDeleted == checksToDelete) {
                                                    if (!deletionError) {
                                                        callback(200)
                                                    } else {
                                                        callback(500, {'Error':'Errors encpuntered when attempting to delete all the usrs checks. All checks may not have been deleted from the system successfully'})
                                                    }
                                                }
                                            }
                                        })
                                    })
                                } else {
                                    callback(200)
                                }
                            } else {
                                callback(500, {'Error': 'Could not delete the specified user'})
                            }
                        })
                    } else {
                        callback(400, {'Error': 'The user could not be found'})
                    }
                })
            } else {
                callback(403, {'Error': 'Missing required token in header or token is invalid'})
            }
        })

    } else {
        callback(400,{'Error': 'Missing required field'})
    }
}


// Containers for tokens submethods
handlers._tokens = {}

// Tokens handlers
handlers.tokens = function(data, callback) {
    let acceptableMethods = ['post','get','put','delete']
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method](data, callback)
    } else {
        callback(405)
    }
}

// Tokens -> post
handlers._tokens.post = function(data, callback) {
    // Check that phone number is valid
    const phone = (typeof(data.payload.phone) == "string" && data.payload.phone.trim().length == 10) ? data.payload.phone.trim() : false
    const password = (typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0) ? data.payload.password.trim() : false
    if (phone && password) {
        // Lookup the user who matches the phone number
        _data.read('users', phone, function(err, userData) {
            if (!err && userData) {
                // Hash the sent password and compare it to the password stored in the user object
                // Hash the password
                const hashedPassword = helpers.hash(password)
                if (hashedPassword == userData.hashedPassword) {
                    // Create a new token with a random name. Set expiration after one hour
                    const tokenId = helpers.createRandomString(20)
                    const expires = Date.now() + 1000 * 60 * 60
                    const tokenObject = {
                        phone: phone,
                        id: tokenId,
                        expires: expires
                    }

                    // Store the token
                    _data.create('tokens', tokenId, tokenObject, function(err) {
                        if (!err) {
                            callback(200, tokenObject)
                        } else {
                            callback(500, {'Error': 'Could not create the new token'})
                        }
                    })
                } else {
                    callback(400, {'Error': 'Password did not match the specified user\'s stored password'})
                }

            } else {
                callback(400, {'Error': 'Could not find the specified user'})
            }
        })
    } else {
        callback(400, {'Error': 'Missing required field(s)'})
    }

}

// Tokens -> get
// Required data: id
// Optional data: none
handlers._tokens.get = function(data, callback) {
    // Check that the id they sent is valid
    const id = (typeof(data.queryStringObject.id) == "string" && data.queryStringObject.id.trim().length == 20) ? data.queryStringObject.id.trim() : false
    if (id) {
        // Lookup the user
        _data.read('tokens',id, function(err, tokenData) {
            if (!err && tokenData) {
                // Remove hashed password from user object before returning it
                callback(200, tokenData)
            } else {
                callback(404)
            }
        })

    } else {
        callback(400,{'Error': 'Missing required field'})
    }
}

// Tokens -> put
// Required fields: id, extend
// Optional data: none
handlers._tokens.put = function(data, callback) {
    const id = (typeof(data.payload.id) == "string" && data.payload.id.trim().length == 20) ? data.payload.id.trim() : false
    const extend = (typeof(data.payload.extend) == 'boolean' && data.payload.extend == true) ? true : false
    if (id && extend == true) {
        // Lookup the token
        _data.read('tokens', id, function(err, tokenData) {
            if (!err && tokenData) {
                // Check to make sure the token isn't already expired
                if (tokenData.expires > Date.now()) {
                    tokenData.expires = Date.now() + 1000 * 60 * 60

                    //Store the updates
                    _data.update('tokens', id, tokenData, function(err) {
                        if (!err) {
                            callback(200)
                        } else {
                            callback(500,{'Error': 'Could not update the token\'s expiration'})
                        }
                    })
                } else {
                    callback(400, {'Error': 'The token has already expired and cannot be extended'})
                }
            } else {
                callback(400, {'Error': 'Specified token does not exists'})
            }
        })
    } else {
        callback(400, {'Error': 'Missing required field(s) or field(s) are invalid'})
    }
}

// Tokens -> delete
// Required data: id
// Optional data: none
handlers._tokens.delete = function(data, callback) {
    // Check that id is valid
    const id = (typeof(data.queryStringObject.id) == "string" && data.queryStringObject.id.trim().length == 20) ? data.queryStringObject.id.trim() : false
    if (id) {
        // Lookup the user
        _data.read('tokens',id, function(err, data) {
            if (!err && data) {
                _data.delete('tokens', id, function(err) {
                    if (!err) {
                        callback(204)
                    } else {
                        callback(500, {'Error': 'Could not delete the specified token'})
                    }
                })
            } else {
                callback(400, {'Error': 'The user could not be found'})
            }
        })

    } else {
        callback(400,{'Error': 'Missing required field'})
    }
}

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function(id, phone, callback) {
    // Lookup the token
    _data.read('tokens', id, function(err, tokenData) {
        if (!err && tokenData) {
            // Check that token for given phone has not expired
            if (tokenData.phone == phone && tokenData.expires > Date.now()) {
                callback(true)
            } else {
                callback(false)
            }
        } else {
            callback(false)
        }
    })
}

// Checks handlers
handlers.checks = function(data, callback) {
    let acceptableMethods = ['post','get','put','delete']
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._checks[data.method](data, callback)
    } else {
        callback(405)
    }
}

// Containers for checks submethods
handlers._checks = {}

// Checks - post
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none

handlers._checks.post = function(data, callback) {
    const protocol = typeof(data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol.trim() : false
    const url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false
    const method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false
    const successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false
    const timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 == 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false

    if(protocol && url && method && successCodes && timeoutSeconds) {
        // Get token from heaers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false

        // Lookup the user by reading the token
        _data.read('tokens',token, function(err, tokenData) {
            if (!err && tokenData) {
               const userPhone = tokenData.phone
               
            // Lookup the user data
            _data.read('users', userPhone, function(err, userData) {
                if (!err && userData) {
                    const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []
                    //  Verify that user has less than number of maxChecks per user
                    if (userChecks.length < config.maxChecks) {
                        // Create a randomId for the check
                        const checkId = helpers.createRandomString(20)

                        // Create the check object and include the users phone
                        const checkObject = {
                            id: checkId,
                            userPhone: userPhone,
                            protocol: protocol,
                            url: url,
                            method: method,
                            successCodes: successCodes,
                            timeoutSeconds: timeoutSeconds
                        }

                        // Save the object
                        _data.create('checks', checkId, checkObject, function(err) {
                            if (!err) {
                                // Add the checkId to the users object
                                userData.checks = userChecks
                                userData.checks.push(checkId)

                                // Save the new user data
                                _data.update('users', userPhone, userData, function(err) {
                                    if (!err) {
                                        callback(200, checkObject)
                                    } else {
                                        callback(500, {'Error': 'Could not update user with the new check'})
                                    }
                                })
                            } else {
                                callback(500, {'Error': 'Could not create the new check'})
                            }
                        })
                    } else {
                        callback(400, {'Error': `The user has reached the maximum number of checks ${config.maxChecks}`})
                    }
                } else {
                    callback(403)
                }
            })
            } else {
                callback(403)
            }
        })
    } else {
        callback(400, {'Error': 'Missing required inputs or inputs are invalid'})
    }
}

// Checks - get
// Required data: id
// Optional data: none

handlers._checks.get = function(data, callback) {
    // Check that phone number is valid
    const id = (typeof(data.queryStringObject.id) == "string" && data.queryStringObject.id.trim().length == 20) ? data.queryStringObject.id.trim() : false
    if (id) {
        // Lookup the check
        _data.read('checks', id, function(err, checkData) {
            if (!err && checkData) {
                // Get the token from the headers
                const token = typeof(data.headers.token) == 'string' ? data.headers.token : false
                // Verify that the given token is valid for the phone number
                handlers._tokens.verifyToken(token, checkData.userPhone, function(isTokenValid) {
                    if (isTokenValid) {
                        // Return the check data'
                        callback(200, checkData)
                    } else {
                        callback(403)
                    }
                })
            } else {
                callback(404)
            }
        })

    } else {
        callback(400,{'Error': 'Missing required field'})
    }
}

// Checks - put
// Required data: id
// Optional data: protocol, url, method, successCodes, timeoutSeconds

handlers._checks.put = function(data, callback) {
    // Check that phone number is valid
    const id = (typeof(data.payload.id) == "string" && data.payload.id.trim().length == 20) ? data.payload.id.trim() : false
    
    // Check for optional fields
    const protocol = typeof(data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol.trim() : false
    const url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false
    const method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false
    const successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false
    const timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 == 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false

    // Error if the id is invalid
    if (id) {
        // Check if one or more optional fields has been passed
        if (protocol || url || method || successCodes || timeoutSeconds) {
            // Lookup the check
            _data.read('checks', id, function(err, checkData) {
                if (!err && checkData) {
                    // Get the token from the headers
                    const token = typeof(data.headers.token) == 'string' ? data.headers.token : false
                    // Verify that the given token is valid for the phone number
                    handlers._tokens.verifyToken(token, checkData.userPhone, function(isTokenValid) {
                        if (isTokenValid) {
                            // Update the check
                            if (protocol) {
                                checkData.protocol = protocol
                            }
                            if (url) {
                                checkData.url = url
                            }
                            if (method) {
                                checkData.method = method
                            }
                            if (successCodes) {
                                checkData.successCodes = successCodes
                            }
                            if (timeoutSeconds) {
                                checkData.timeoutSeconds = timeoutSeconds
                            }

                            // Store the new updates
                            _data.update('checks', id, checkData, function(err) {
                                if (!err) {
                                    callback(200)
                                } else {
                                    callback(400, {'Error':'could not update the check'})
                                }
                            })
                        } else {
                            callback(403)
                        }
                    })
                } else {
                    callback(400, {'Error': 'Check id does not exist'})
                }
            })
        } else {
            callback(400,{'Error':'Missing fields to update'})
        }
    } else {
        callback(400,{'Error': 'Missing required fields'})
    }
}

// Checks - delete
// Required data: id
// Optional data: none

handlers._checks.delete = function(data, callback) {
    // Check that phone number is valid
    const id = (typeof(data.queryStringObject.id) == "string" && data.queryStringObject.id.trim().length == 20) ? data.queryStringObject.id.trim() : false
    if (id) {

        // Lookup the check
        _data.read('checks', id, function(err, checkData) {
            if (!err && checkData) {
                // Get the token from the headers
                const token = typeof(data.headers.token) == 'string' ? data.headers.token : false
                // Verify that the given token is valid for the phone number
                handlers._tokens.verifyToken(token, checkData.userPhone, function(isTokenValid) {
                    if (isTokenValid) {
                        // Delete the check data
                        _data.delete('checks', id, function(err) {
                            if (!err) {
                                // Lookup the user
                                _data.read('users',checkData.userPhone, function(err, userData) {
                                    if (!err && userData) {

                                        const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []

                                        // Remove the check from list of checks
                                        const checkPosition = userChecks.indexOf(id)

                                        if (checkPosition > -1) {
                                            userChecks.splice(checkPosition,1)
                                            // Resave the users data

                                            _data.update('users', checkData.userPhone, userData, function(err) {
                                                if (!err) {
                                                    callback(200)
                                                } else {
                                                    callback(500, {'Error': 'Could not update the specified user'})
                                                }
                                            })
                                        } else {
                                            callback(500, {'Error':'Could not find the check in the users checks'})
                                        }
                                    } else {
                                        callback(400, {'Error': 'The user who created the check could not be found, so the check could not be removed'})
                                    }
                                })
                            } else {
                                callback(500, {'Error':'Could not delete the check data'})
                            }
                        })
                    } else {
                        callback(403)
                    }
                })
            } else {
                callback(400, {'Error': 'The checkId does not exist'})
            }
        })

    } else {
        callback(400,{'Error': 'Missing required field'})
    }
}

// Ping handler
handlers.ping = function(data, callback) {
    callback(200)
}
//Not found handler
handlers.notFound = function(data, callback) {
    callback(404)
}

module.exports = handlers