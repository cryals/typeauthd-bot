const axios = require('axios');
const config = require('./config');

class TypeauthdClient {
    constructor() {
        this.client = axios.create({
            baseURL: `https://${config.typeauthd.url}`,
            headers: {
                'Authorization': `Bearer ${config.typeauthd.token}`
            }
        });

        // Request logging
        this.client.interceptors.request.use(request => {
            console.log(`[API] ${request.method.toUpperCase()} ${request.url}`, request.params || '');
            return request;
        });

        // Error logging
        this.client.interceptors.response.use(
            response => response,
            error => {
                if (error.response) {
                    console.error(`[API ERROR] ${error.config.method.toUpperCase()} ${error.config.url} | Status: ${error.response.status}`);
                    console.error(`[API DATA]`, JSON.stringify(error.response.data).slice(0, 500));
                } else if (error.request) {
                    console.error(`[API ERROR] No response received from ${error.config.url}`);
                } else {
                    console.error(`[API ERROR]`, error.message);
                }
                return Promise.reject(error);
            }
        );
    }

    async getUuid(id, method = 'discord') {
        const response = await this.client.get('/api/uuid', { params: { method, id } });
        return response.data;
    }

    async identify(id, method = 'discord') {
        const response = await this.client.get('/api/identify', { params: { method, id } });
        return response.data;
    }

    async getRoles(id, guildId, method = 'discord') {
        const response = await this.client.get('/api/roles', { params: { method, id, guildId } });
        return response.data;
    }

    async getGuilds(id, method = 'discord') {
        const response = await this.client.get('/api/guilds', { params: { method, id } });
        return response.data;
    }

    async getExtra(id, method = 'discord') {
        const response = await this.client.get('/api/extra', { params: { method, id } });
        return response.data;
    }

    async patchExtra(id, data, method = 'discord') {
        const response = await this.client.patch('/api/extra', data, { params: { method, id } });
        return response.data;
    }

    async deleteUser(id, method = 'discord') {
        const response = await this.client.post('/api/delete', {}, { params: { method, id } });
        return response.data;
    }

    async generateLink(uid) {
        const response = await this.client.get('/api/link', { params: { uid } });
        return response.data;
    }
}

module.exports = new TypeauthdClient();
