const moment = require("moment");

module.exports = {
  config: {
    name: "suzy",
    version: "1.0",
    author: "Ajeet",
    countDown: 5,
    role: 2, // 🔒 Only Admin
    shortDescription: "Bot active status",
    longDescription: "Replies when called 'Suzy' with uptime info",
    category: "system",
  },

  onStart: async function ({ api, event, args }) {
    // Ye prefix se run hoga agar koi manually call kare
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    return api.sendMessage(
      `✅ Bot is active!\n⏳ Uptime: ${hours}h ${minutes}m ${seconds}s`,
      event.threadID,
      event.messageID
    );
  },

  onChat: async function ({ api, event, usersData }) {
    const { body, senderID, threadID, messageID } = event;
    if (!body) return;

    // Trigger word
    if (body.toLowerCase() === "suzy") {
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);

      api.sendMessage(
        `Ji master! I'm active right now.\n⏳ Uptime: ${hours}h ${minutes}m ${seconds}s`,
        threadID,
        messageID
      );

      // ❤️ Reaction
      api.setMessageReaction("❤️", messageID, () => {}, true);
    }
  }
};
