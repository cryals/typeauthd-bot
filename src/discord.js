const axios = require('axios');
const config = require('./config');

class DiscordService {
    constructor() {
        this.cache = new Map(); // guildId -> { roles: [], timestamp: Date }
        this.cacheTTL = 10 * 60 * 1000; // 10 минут
    }

    async getGuildRoles(guildId) {
        if (!config.discord.token) return null;

        const now = Date.now();
        const cached = this.cache.get(guildId);
        if (cached && (now - cached.timestamp < this.cacheTTL)) {
            return cached.roles;
        }

        try {
            console.log(`[DISCORD] Fetching roles for guild ${guildId}...`);
            const response = await axios.get(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
                headers: {
                    'Authorization': `Bot ${config.discord.token}`
                }
            });

            const roles = response.data;
            this.cache.set(guildId, { roles, timestamp: now });
            return roles;
        } catch (error) {
            console.error(`[DISCORD ERROR] Failed to fetch roles for guild ${guildId}:`, error.response?.data || error.message);
            return null;
        }
    }

    async resolveRoleNames(guildId, roleIds) {
        const guildRoles = await this.getGuildRoles(guildId);
        if (!guildRoles) return roleIds.map(id => ({ id, name: id })); // Возвращаем ID как имя, если не смогли загрузить

        return roleIds.map(id => {
            const found = guildRoles.find(r => r.id === id);
            return {
                id,
                name: found ? found.name : id
            };
        });
    }
}

module.exports = new DiscordService();
