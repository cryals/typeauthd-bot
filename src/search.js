const api = require('./api');

class SearchService {
    async search(query) {
        const results = [];
        
        // Run lookups in parallel
        const [discordLookup, uidLookup] = await Promise.allSettled([
            api.identify(query, 'discord'),
            api.identify(query, 'uid')
        ]);

        // If found via Discord ID
        if (discordLookup.status === 'fulfilled' && discordLookup.value && !discordLookup.value.error) {
            try {
                const uuidData = await api.getUuid(query, 'discord');
                results.push({
                    type: 'discord',
                    discordId: query,
                    uuid: uuidData.uuid,
                    details: discordLookup.value
                });
            } catch (e) {
                // If identify worked but uuid failed (might be 404 or other), only add if it's not a clear failure
                if (e.response?.status !== 404) {
                    results.push({
                        type: 'discord',
                        discordId: query,
                        uuid: 'Unknown',
                        details: discordLookup.value
                    });
                }
            }
        }

        // If found via UID
        if (uidLookup.status === 'fulfilled' && uidLookup.value && !uidLookup.value.error) {
            results.push({
                type: 'uid',
                discordId: uidLookup.value.id || 'Unknown',
                uuid: query,
                details: uidLookup.value
            });
        }

        // Remove duplicates if the same user was found by both (rare if query is same string)
        const uniqueResults = [];
        const seenUids = new Set();
        for (const res of results) {
            if (!seenUids.has(res.uuid)) {
                uniqueResults.push(res);
                seenUids.add(res.uuid);
            }
        }

        return uniqueResults;
    }
}

module.exports = new SearchService();
