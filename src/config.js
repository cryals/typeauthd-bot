const fs = require('fs');
const path = require('path');
const ini = require('ini');

const configPath = path.join(__dirname, '..', 'settings.ini');

function loadConfig() {
    if (!fs.existsSync(configPath)) {
        throw new Error(`Config file not found: ${configPath}`);
    }

    const fileContent = fs.readFileSync(configPath, 'utf-8');
    const parsedConfig = ini.parse(fileContent);

    // Parse authorized IDs into an array
    let authorizedIds = [];
    if (parsedConfig.telegram && parsedConfig.telegram.id) {
        authorizedIds = parsedConfig.telegram.id
            .split(',')
            .map(id => id.trim())
            .filter(id => id.length > 0)
            .map(id => parseInt(id, 10));
    }

    return {
        telegram: {
            token: parsedConfig.telegram?.token,
            authorizedIds
        },
        typeauthd: {
            token: parsedConfig.typeauthd?.token?.replace(/^"(.*)"$/, '$1'), // Remove quotes if present
            url: parsedConfig.typeauthd?.url?.replace(/^"(.*)"$/, '$1')
        },
        discord: {
            token: parsedConfig.discord?.token?.replace(/^"(.*)"$/, '$1')
        },
        security: {
            hash: parsedConfig.security?.hash
        }
    };
}

module.exports = loadConfig();
