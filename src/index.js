const { Telegraf, session, Markup } = require('telegraf');
const config = require('./config');
const auth = require('./middleware/auth');
const menus = require('./menus');
const api = require('./api');
const searchService = require('./search');
const discordService = require('./discord');
const si = require('systeminformation');

const bot = new Telegraf(config.telegram.token);

// Middleware
bot.use(session());
bot.use((ctx, next) => {
    ctx.session ??= {};
    return next();
});
bot.use(auth);

// Helper to update the single "master message"
async function updateMasterMessage(ctx, menu) {
    const { text, extra } = menu;
    const session = ctx.session || {};

    try {
        if (session.masterMessageId) {
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                session.masterMessageId,
                null,
                text,
                { parse_mode: 'Markdown', reply_markup: extra, disable_web_page_preview: true }
            );
            return;
        }
    } catch (error) {
        // Message might be too old to edit or deleted, fall back to reply
        console.log('Edit failed or no previous message, sending new master message');
    }

    const sent = await ctx.reply(text, { 
        parse_mode: 'Markdown', 
        reply_markup: extra,
        disable_web_page_preview: true
    });
    ctx.session.masterMessageId = sent.message_id;
}

// Commands
bot.start(async (ctx) => {
    ctx.session = ctx.session || {};
    ctx.session.state = 'idle';
    await updateMasterMessage(ctx, menus.main());
});

// Callback Handlers
bot.action('menu_main', async (ctx) => {
    ctx.session.state = 'idle';
    await updateMasterMessage(ctx, menus.main());
    await ctx.answerCbQuery();
});

bot.action('menu_search', async (ctx) => {
    ctx.session.state = 'waiting_for_search';
    await updateMasterMessage(ctx, menus.searchPrompt());
    await ctx.answerCbQuery();
});

bot.action('menu_link', async (ctx) => {
    ctx.session.state = 'waiting_for_link_uid';
    await updateMasterMessage(ctx, menus.linkPrompt());
    await ctx.answerCbQuery();
});

bot.action('menu_info', async (ctx) => {
    await ctx.answerCbQuery('📊 Сбор метрик...');
    try {
        const [cpu, mem, fsSize] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.fsSize()
        ]);

        const stats = {
            cpu: { currentLoad: cpu.currentLoad },
            mem: {
                totalGB: (mem.total / (1024 ** 3)).toFixed(1),
                usedGB: (mem.used / (1024 ** 3)).toFixed(1),
                percent: ((mem.used / mem.total) * 100).toFixed(1)
            },
            disk: {
                totalGB: (fsSize[0].size / (1024 ** 3)).toFixed(1),
                usedGB: (fsSize[0].used / (1024 ** 3)).toFixed(1),
                percent: fsSize[0].use.toFixed(1)
            }
        };

        await updateMasterMessage(ctx, menus.systemInfo(config, stats));
    } catch (error) {
        console.error('[STATS ERROR]', error);
        await updateMasterMessage(ctx, menus.systemInfo(config));
    }
});

// Сокращенные хендлеры
bot.action(/^vu:(.+)$/, async (ctx) => {
    const uuid = ctx.match[1];
    const admin = ctx.from.username || ctx.from.id;
    console.log(`[ACTION] Admin ${admin} viewing user: ${uuid}`);
    await ctx.answerCbQuery('⌛ Загрузка профиля...');
    try {
        const details = await api.identify(uuid, 'uid');
        await updateMasterMessage(ctx, menus.userProfile({ uuid, discordId: details.id }, details));
    } catch (error) {
        const errorDetails = {
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.url
        };
        await updateMasterMessage(ctx, menus.error(`Не удалось загрузить пользователя: ${error.message}`, errorDetails));
    }
});

bot.action(/^ur:(.+)$/, async (ctx) => {
    const uuid = ctx.match[1];
    await ctx.answerCbQuery('🛡 Выбор сервера');
    ctx.session.targetUuid = uuid; // Сохраняем UUID в сессии
    await updateMasterMessage(ctx, menus.guildIdPrompt(uuid));
});

bot.action(/^wmg:(.+)$/, async (ctx) => {
    const uuid = ctx.match[1];
    await ctx.answerCbQuery('⌨️ Введите Guild ID');
    ctx.session.state = 'waiting_for_guild_id';
    ctx.session.targetUuid = uuid;
    await updateMasterMessage(ctx, {
        text: '🛡 *ЗАПРОС РОЛЕЙ*\n\nВведите **Guild ID** сервера:',
        extra: Markup.inlineKeyboard([[Markup.button.callback('⬅️ Отмена', `ur:${uuid}`)]]).reply_markup
    });
});

bot.action(/^gr:(.+)$/, async (ctx) => {
    const guildId = ctx.match[1];
    const uuid = ctx.session.targetUuid; // Берем UUID из сессии
    
    if (!uuid) {
        return ctx.answerCbQuery('❌ Ошибка: UUID потерян. Вернитесь в поиск.');
    }

    await ctx.answerCbQuery('🛡 Загрузка ролей...');
    console.log(`[ACTION] Fetching roles for UID ${uuid} in Guild ${guildId}`);
    await updateMasterMessage(ctx, { text: '🛡 *ЗАПРОС РОЛЕЙ*\n\n⏳ _Загрузка списка ролей..._', extra: null });
    
    try {
        const response = await api.getRoles(uuid, guildId, 'uid');
        console.log(`[API RESPONSE] Roles for ${uuid} in ${guildId}:`, JSON.stringify(response).slice(0, 500));
        
        const roleIds = Array.isArray(response) ? response : (response.roles || []);
        const resolvedRoles = await discordService.resolveRoleNames(guildId, roleIds);
        
        await updateMasterMessage(ctx, menus.rolesResult(uuid, resolvedRoles, guildId));
    } catch (error) {
        const errorDetails = {
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.url,
            guildId
        };
        await updateMasterMessage(ctx, menus.error(`Ошибка при получении ролей: ${error.message}`, errorDetails));
    }
});

bot.action(/^ue:(.+)$/, async (ctx) => {
    const uuid = ctx.match[1];
    await ctx.answerCbQuery('📦 Загрузка данных...');
    try {
        const extraData = await api.getExtra(uuid, 'uid');
        const text = `📦 *ДОПОЛНИТЕЛЬНЫЕ ДАННЫЕ*\n──────────────────\n\`\`\`json\n${JSON.stringify(extraData, null, 2)}\n\`\`\``;
        
        await updateMasterMessage(ctx, {
            text,
            extra: Markup.inlineKeyboard([[Markup.button.callback('⬅️ Назад в профиль', `vu:${uuid}`)]]).reply_markup
        });
    } catch (error) {
        const errorDetails = {
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.url
        };
        await updateMasterMessage(ctx, menus.error(`Ошибка при загрузке данных: ${error.message}`, errorDetails));
    }
});

bot.action(/^ucd:(.+)$/, async (ctx) => {
    const uuid = ctx.match[1];
    await updateMasterMessage(ctx, menus.confirmDelete(uuid));
    await ctx.answerCbQuery();
});

bot.action(/^ud:(.+)$/, async (ctx) => {
    const uuid = ctx.match[1];
    const admin = ctx.from.username || ctx.from.id;
    console.log(`[ACTION] Admin ${admin} DELETING user: ${uuid}`);
    await ctx.answerCbQuery('🗑 Удаление...');
    try {
        await api.deleteUser(uuid, 'uid');
        await updateMasterMessage(ctx, { 
            text: `✅ *УСПЕШНО*\n\nЗапись пользователя \`${uuid}\` была удалена.`, 
            extra: Markup.inlineKeyboard([[Markup.button.callback('🏠 В главное меню', 'menu_main')]]).reply_markup
        });
    } catch (error) {
        const errorDetails = {
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.url
        };
        await updateMasterMessage(ctx, menus.error(`Ошибка при удалении: ${error.message}`, errorDetails));
    }
});

// Text Input Handler
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    const session = ctx.session || {};
    const state = session.state;
    const admin = ctx.from.username || ctx.from.id;

    try { await ctx.deleteMessage(); } catch (e) {}

    if (state === 'waiting_for_search') {
        console.log(`[SEARCH] Admin ${admin} searching for: ${text}`);
        await updateMasterMessage(ctx, { text: '🔍 *УМНЫЙ ПОИСК*\n\n⏳ _Поиск совпадений..._', extra: null });
        try {
            const results = await searchService.search(text);
            await updateMasterMessage(ctx, menus.searchResults(results));
        } catch (error) {
            const errorDetails = { status: error.response?.status, data: error.response?.data };
            await updateMasterMessage(ctx, menus.error(`Ошибка поиска: ${error.message}`, errorDetails));
        }
    } else if (state === 'waiting_for_link_uid') {
        console.log(`[ACTION] Admin ${admin} generating link for UID: ${text}`);
        await updateMasterMessage(ctx, { text: '🔗 *СОЗДАНИЕ ССЫЛКИ*\n\n⏳ _Генерация..._', extra: null });
        try {
            const data = await api.generateLink(text);
            await updateMasterMessage(ctx, menus.linkResult(data.link));
        } catch (error) {
            const errorDetails = { status: error.response?.status, data: error.response?.data };
            await updateMasterMessage(ctx, menus.error(`Ошибка при генерации ссылки: ${error.message}`, errorDetails));
        }
    } else if (state === 'waiting_for_guild_id') {
        const uuid = session.targetUuid;
        const guildId = text;
        console.log(`[ACTION] Admin ${admin} fetching roles for UID ${uuid} in Guild ${guildId}`);
        await updateMasterMessage(ctx, { text: '🛡 *ЗАПРОС РОЛЕЙ*\n\n⏳ _Загрузка списка ролей..._', extra: null });
        try {
            const response = await api.getRoles(uuid, guildId, 'uid');
            const roleIds = Array.isArray(response) ? response : (response.roles || []);
            const resolvedRoles = await discordService.resolveRoleNames(guildId, roleIds);
            await updateMasterMessage(ctx, menus.rolesResult(uuid, resolvedRoles, guildId));
        } catch (error) {
            const errorDetails = { status: error.response?.status, data: error.response?.data, guildId };
            await updateMasterMessage(ctx, menus.error(`Ошибка при получении ролей: ${error.message}`, errorDetails));
        }
    }
});

bot.catch((err, ctx) => { console.error(`Ooops, encountered an error for ${ctx.updateType}`, err); });
bot.launch();
console.log('🚀 typeauthd bot started');
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
