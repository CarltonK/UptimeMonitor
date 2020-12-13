// Environments
let environments = {}

// Staging Environment -> Default
environments.staging = {
    httpPort: 3000,
    httpsPort: 3001,
    envName: 'staging',
    hashingSecret: 'thisIsASecret',
    maxChecks: 5
}

// Production Environment
environments.production = {
    httpPort: 5000,
    httpsPort: 5001,
    envName: 'production',
    hashingSecret: 'thisIsAlsoASecret',
    maxChecks: 5
}

// Determine which environment is to be exported as CLI arguments
const currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : ''


// Check if currentEnvironment is defined above else default to staging
const exportEnvironment = typeof(environments[currentEnvironment]) == 'object' ?  environments[currentEnvironment] : environments.staging

// Export the module
module.exports = exportEnvironment