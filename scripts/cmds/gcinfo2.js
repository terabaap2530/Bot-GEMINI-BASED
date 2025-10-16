const fs = require("fs");
const axios = require("axios");

module.exports = {
  config: {
    name: "gcinfo2",
    aliases: [],
    author: "Axshu",
    version: "3.2",
    cooldowns: 5,
    role: 0,
    shortDescription: "Show detailed group info",
    longDescription: "Lists all groups the bot is in and lets you select one to view full info.",
    category: "group",
    guide: "{p}gcinfo2"
  },

  onStart: async function ({ api, event, message }) {
    const threads = await api.getThreadList(100, null, ["INBOX"]);
    const groupThreads = threads.filter(t => t.isGroup);
    if (!groupThreads.length) return message.reply("❌ Bot is not in any groups.");

    let listMsg = "📜 Groups:\n\n";
    groupThreads.forEach((t, i) => listMsg += `${i + 1}. ${t.name || "Unnamed Group"}\n`);
    listMsg += "\n📩 Reply with the group number.";

    const sent = await message.reply(listMsg);

    global.GoatBot.onReply.set(sent.messageID, {
      commandName: this.config.name,
      author: event.senderID,
      messageID: sent.messageID,
      groups: groupThreads
    });
  },

  onReply: async function ({ api, event, message, Reply }) {
    const { author, groups } = Reply;
    if (event.senderID !== author) return;

    const num = parseInt(event.body);
    if (isNaN(num) || num < 1 || num > groups.length) return;

    const threadID = groups[num - 1].threadID;
    const info = await api.getThreadInfo(threadID);

    const threadName = info.threadName || "Unnamed Group";
    const emoji = info.emoji || "❌ Not set";
    const approvalMode = info.approvalMode ? "ON" : "OFF";
    const imageSrc = info.imageSrc || null;
    const adminIDs = info.adminIDs.map(a => a.id);

    const adminList = info.userInfo
      .filter(u => adminIDs.includes(u.id))
      .map(u => `• ${u.name} (${u.id})`);

    const memberList = info.userInfo
      .map(u => `• ${u.name} (${u.id})${adminIDs.includes(u.id) ? " [ADMIN]" : ""}`);

    const members = info.participantIDs.length;
    const genderStats = info.userInfo.reduce(
      (acc, u) => {
        if (u.gender === "MALE") acc.male++;
        else if (u.gender === "FEMALE") acc.female++;
        else acc.unknown++;
        return acc;
      },
      { male: 0, female: 0, unknown: 0 }
    );

    const messageCount = info.messageCount?.toLocaleString() || "Unknown";
    const nicknames = info.nicknames
      ? Object.entries(info.nicknames).map(([id, nick]) => {
          const name = info.userInfo.find(u => u.id === id)?.name || id;
          return `• ${name}: ${nick}`;
        })
      : [];

    const body =
`===== [ GROUP INFO ] =====

• Name: ${threadName}
• ID: ${threadID}
• Emoji: ${emoji}
• Approval Mode: ${approvalMode}

===== [ MEMBERS (${members}) ] =====
${memberList.join("\n") || "No members found"}

===== [ ADMINS (${adminList.length}) ] =====
${adminList.join("\n") || "No admins found"}

===== [ STATS ] =====
• Total Messages: ${messageCount}

===== [ NICKNAMES ] =====
${nicknames.join("\n") || "None set"}
`;

    if (imageSrc) {
      const img = await axios.get(imageSrc, { responseType: "stream" });
      return message.reply({ body, attachment: img.data });
    } else {
      return message.reply(body);
    }
  }
};
