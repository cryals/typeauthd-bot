const { Markup } = require('telegraf');

const menus = {
    main: () => ({
        text: '🏦 *УПРАВЛЕНИЕ TYPEAUTHD*\n\nВыберите действие:',
        extra: Markup.inlineKeyboard([
            [Markup.button.callback('🔍 Умный поиск', 'menu_search')],
            [Markup.button.callback('🔗 Создать ссылку', 'menu_link')],
            [Markup.button.callback('📊 Статус системы', 'menu_info')]
        ]).reply_markup
    }),

    searchPrompt: () => ({
        text: '🔍 *УМНЫЙ ПОИСК*\n\nВведите **ник**, **UUID** или **Discord ID**:',
        extra: Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Назад', 'menu_main')]
        ]).reply_markup
    }),

    searchResults: (results) => {
        const buttons = results.map(user => [
            Markup.button.callback(
                `Discord: ${user.discordId} | Uid: ${user.uuid.slice(0, 8)}...`, 
                `vu:${user.uuid}`
            )
        ]);
        buttons.push([Markup.button.callback('⬅️ Назад', 'menu_search')]);

        return {
            text: results.length > 0 
                ? `✅ *Найдено совпадений: ${results.length}*` 
                : '❌ *Ничего не найдено.*\nПроверьте правильность ID.',
            extra: Markup.inlineKeyboard(buttons).reply_markup
        };
    },

    userProfile: (user, details) => {
        let text = `👤 *ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ*\n──────────────────\n`;
        text += `🆔 *UUID:* \`${user.uuid}\`\n`;
        text += `💬 *Discord:* \`${user.discordId || 'Не привязан'}\`\n`;
        if (details.username) text += `🏷 *Ник:* \`${details.username}#${details.discriminator}\`\n`;
        text += `──────────────────\n`;
        
        return {
            text,
            extra: Markup.inlineKeyboard([
                [Markup.button.callback('🛡 Роли', `ur:${user.uuid}`)],
                [Markup.button.callback('📦 Данные (Extra)', `ue:${user.uuid}`)],
                [
                    Markup.button.callback('🔄 Обновить', `vu:${user.uuid}`),
                    Markup.button.callback('🗑 Удалить', `ucd:${user.uuid}`)
                ],
                [Markup.button.callback('⬅️ Назад', 'menu_search')]
            ]).reply_markup
        };
    },

    guildIdPrompt: (uuid) => ({
        text: '🛡 *ВЫБОР СЕРВЕРА*\n\nВыберите сервер для просмотра ролей или введите ID вручную:',
        extra: Markup.inlineKeyboard([
            [Markup.button.callback('🪐 Lunarix', `gr:1039584848689496065`)],
            [Markup.button.callback('🐀 Ratgore', `gr:1318776836599320657`)],
            [Markup.button.callback('⌨️ Другое (ввести ID)', `wmg:${uuid}`)],
            [Markup.button.callback('⬅️ Назад в профиль', `vu:${uuid}`)]
        ]).reply_markup
    }),

    rolesResult: (uuid, rolesData, guildId) => {
        let text = `🛡 *РОЛИ ПОЛЬЗОВАТЕЛЯ*\n──────────────────\n`;
        const roles = Array.isArray(rolesData) ? rolesData : (rolesData.roles || []);
        
        if (roles.length > 0) {
            roles.forEach(role => {
                text += `• ${role.name || role} (\`${role.id || role}\`)\n`;
            });
        } else {
            text += `_Роли не найдены._`;
        }
        
        return {
            text,
            extra: Markup.inlineKeyboard([
                [Markup.button.callback('🔄 Обновить', `gr:${guildId}`)],
                [Markup.button.callback('⬅️ Назад в профиль', `vu:${uuid}`)]
            ]).reply_markup
        };
    },

    confirmDelete: (uuid) => ({
        text: '⚠️ *ПОДТВЕРЖДЕНИЕ*\n\nУдалить привязку для пользователя:\n`' + uuid + '`?\n\n_Это действие нельзя отменить._',
        extra: Markup.inlineKeyboard([
            [Markup.button.callback('✅ Да, удалить', `ud:${uuid}`)],
            [Markup.button.callback('❌ Отмена', `vu:${uuid}`)]
        ]).reply_markup
    }),

    linkPrompt: () => ({
        text: '🔗 *СОЗДАНИЕ ССЫЛКИ*\n\nВведите **UUID** для генерации ссылки авторизации:',
        extra: Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Назад', 'menu_main')]
        ]).reply_markup
    }),

    linkResult: (link) => ({
        text: `✅ *ССЫЛКА СОЗДАНА*\n\n🔗 [Авторизоваться](${link})\n\n\`${link}\``,
        extra: Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Назад', 'menu_link')]
        ]).reply_markup
    }),

    systemInfo: (config, stats = {}) => {
        let text = `📊 *СТАТУС СИСТЕМЫ*\n──────────────────\n`;
        text += `🌐 *API:* \`${config.typeauthd.url}\`\n`;
        text += `👥 *Админов:* \`${config.telegram.authorizedIds.length}\`\n`;
        text += `⚡️ *Бот:* \`Online\`\n\n`;
        
        if (stats.cpu) {
            text += `🖥 *CPU:* \`${stats.cpu.currentLoad.toFixed(1)}%\`\n`;
            text += `🧠 *RAM:* \`${stats.mem.usedGB} / ${stats.mem.totalGB} GB\` (\`${stats.mem.percent}%\`)\n`;
            text += `💾 *Disk:* \`${stats.disk.usedGB} / ${stats.disk.totalGB} GB\` (\`${stats.disk.percent}%\`)\n`;
        } else {
            text += `⏳ _Загрузка метрик..._`;
        }
        
        return {
            text,
            extra: Markup.inlineKeyboard([
                [Markup.button.callback('🔄 Обновить', 'menu_info')],
                [Markup.button.callback('⬅️ Назад', 'menu_main')]
            ]).reply_markup
        };
    },

    error: (message, details = null) => {
        let text = `🔴 *ОШИБКА СИСТЕМЫ*\n\n${message}`;
        if (details) {
            text += `\n\n*Техническая информация:*\n\`\`\`json\n${JSON.stringify(details, null, 2).slice(0, 1000)}\n\`\`\``;
        }
        return {
            text,
            extra: Markup.inlineKeyboard([
                [Markup.button.callback('🏠 В меню', 'menu_main')]
            ]).reply_markup
        };
    }
};

module.exports = menus;
