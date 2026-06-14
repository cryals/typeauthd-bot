const config = require('../config');

module.exports = async (ctx, next) => {
    const userId = ctx.from?.id;
    
    if (!userId) return;

    if (config.telegram.authorizedIds.includes(userId)) {
        return next();
    }

    // Only reply to /start or text if not authorized
    if (ctx.message || ctx.callbackQuery) {
        try {
            await ctx.reply('🚫 *Access Denied.*\nThis bot is restricted to authorized administrators only.');
        } catch (e) {
            console.error('Failed to send access denied message:', e.message);
        }
    }
};
