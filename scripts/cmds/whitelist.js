const { config } = global.GoatBot;
const { writeFileSync } = require("fs-extra");

module.exports = {
  config: {
    name: "whitelist",
    aliases: ["wl"],
    version: "2.0",
    author: "Shikaki | Base Code by Turtle Rehat, and Ntkhang03",
    countDown: 5,
    role: 2,
    description: {
      en: "Manage whitelist: add, remove, list users, and toggle whitelist mode"
    },
    category: "owner",
    guide: {
      en: '{pn}: Show whitelist mode status\n{pn} [add | a or remove | r] <uid | @tag>: Add/remove user(s) to/from whitelist\n{pn} (list | l) [page-number | uid | @tag]: List whitelisted users or check specific user\n{pn} [on | off]: Enable/disable whitelist mode'
    }
  },

  onStart: async function ({ message, args, usersData, event }) {
    const action = args[0]?.toLowerCase();
    const whiteList = config.whiteListMode.whiteListIds;

    const updateConfig = () => writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));

    const getTargetIds = () => {
      if (event.type === "message_reply") return [event.messageReply.senderID];
      return Object.keys(event.mentions).length > 0 ? Object.keys(event.mentions) : args.slice(1).filter(arg => !isNaN(arg));
    };

    // If no arguments provided, show whitelist mode status
    if (!action) {
      const status = config.whiteListMode.enable ? "enabled" : "disabled";
      return message.reply(`Whitelist mode is currently ${status}.\nTotal whitelisted users: ${whiteList.length}`);
    }

    switch (action) {
      case "add":
      case "a":
        const addIds = getTargetIds();
        if (addIds.length === 0) return message.reply("⚠ Please provide user ID(s) or tag user(s) to add.");
        const added = addIds.filter(id => !whiteList.includes(id));
        whiteList.push(...added);
        updateConfig();
        return message.reply(`✅ Added ${added.length} user(s) to whitelist.`);

      case "remove":
      case "r":
        const removeIds = getTargetIds();
        if (removeIds.length === 0) return message.reply("⚠ Please provide user ID(s) or tag user(s) to remove.");
        const removed = removeIds.filter(id => whiteList.includes(id));
        config.whiteListMode.whiteListIds = whiteList.filter(id => !removed.includes(id));
        updateConfig();
        return message.reply(`✅ Removed ${removed.length} user(s) from whitelist.`);

      case "list":
      case "l":
        const pageSize = 20;
        const targetId = getTargetIds()[0];

        if (targetId) {
          const isWhitelisted = whiteList.includes(targetId);
          const userName = await usersData.getName(targetId) || "Unknown";
          return message.reply(`User ${userName} (${targetId}) is ${isWhitelisted ? "✅ whitelisted" : "❌ not whitelisted"}.`);
        }

        const page = parseInt(args[1]) || 1;
        const totalPages = Math.ceil(whiteList.length / pageSize);
        if (page > totalPages) return message.reply("No members on this page.");
        const startIndex = (page - 1) * pageSize;
        const pageMembers = whiteList.slice(startIndex, startIndex + pageSize);
        const membersText = await Promise.all(pageMembers.map(async id => ` • ${await usersData.getName(id) || "Unknown"} (${id})`));
        return message.reply(`👑 Whitelisted users (Page ${page}/${totalPages}):\n${membersText.join("\n")}\n\nTotal: ${whiteList.length}`);

      case "on":
      case "off":
        config.whiteListMode.enable = action === "on";
        updateConfig();
        return message.reply(`✅ Whitelist mode ${action === "on" ? "enabled" : "disabled"}.`);

      default:
        return message.reply("⚠ Invalid input. Use 'add', 'remove', 'list', 'on', or 'off'.");
    }
  }
};
