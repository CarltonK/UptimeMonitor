/*
Primary file for API
*/

//Dependencies
const fs = require('fs')
const path = require('path')
const helpers = require('./helpers')

// Container for the module
let lib = {}

// Base DIR of data
lib.baseDir = path.join(__dirname,'/../.data/')

// Write data to a file
lib.create = function(dir,file, data, callback) {
    // Open a file with write permissions
    fs.open(lib.baseDir + dir + '/' + file + '.json', 'wx', function(err,fileDescriptor) {
        if (!err && fileDescriptor) {
            // Convert data to string
            const stringData = JSON.stringify(data)

            //Write to file and close it
            fs.writeFile(fileDescriptor, stringData, function(err) {
                if (!err) {
                    fs.close(fileDescriptor, function(err) {
                        if (!err) {
                            callback(false)
                        }
                        else {
                            callback('Error closing new file')
                        }
                    })
                }
                else {
                    callback('Error writing to new file')
                }
            })
        }
        else {
            callback('Could not create new file it may already exist')
        }
    })
}

// Read data from a file
lib.read = function(dir, file, callback) {
    fs.readFile(lib.baseDir + dir + '/' + file + '.json','utf8', function(err, data) {
        if (!err && data) {
            const parsedData = helpers.parseJsonToObject(data)
            callback(false, parsedData)
        } else {
            callback(err, data)
        }
    })
}

// Update data inside a file
lib.update = function(dir, file, data, callback) {
    // Open the file
    fs.open(lib.baseDir + dir + '/' + file + '.json','r+', function(err, fileDescriptor) {
        if (!err && fileDescriptor) {
            // Convert data to string
            const stringData = JSON.stringify(data)

            // Truncate the file
            fs.ftruncate(fileDescriptor, function(err) {
                if (!err) {
                    fs.writeFile(fileDescriptor, stringData, function(err) {
                        if (!err) {
                            fs.close(fileDescriptor, function(err) {
                                if (!err) {
                                    callback(false)
                                }
                                else {
                                   callback('Error closing the file') 
                                }
                            })
                        } else {
                            callback('Error writing to existing file')
                        }
                    })
                }
                else {
                    callback('Error truncating file')
                }
            })
        }
        else {
            callback('Could not open the file for updating, it may not exist yet')
        }
    })
}

// Delete a file
lib.delete = function(dir, file, callback) {
    // Unlink a file from file system
    fs.unlink(lib.baseDir + dir + '/' + file + '.json', function(err) {
        if (!err) {
            callback(false)
        }
        else {
            callback('Error deleting the file')
        }
    })
}

//Export module
module.exports = lib