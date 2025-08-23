const fs = require("fs");
const axios = require("axios");

module.exports = {
  config: {
    name: "gcinfo",
    aliases: ["groupinfo", "chatinfo"],
    author: "Lord Itachi",
    version: "2.0",
    cooldowns: 5,
    role: 0,
    shortDescription: "Show detailed group info",
    longDescription: "Displays complete information about the group chat including members, admins, emoji, approval mode, and more.",
    category: "group",
    guide: "{p}gcinfo"
  },

  onStart: async function ({ api, event, message }) {
    try {
      const threadInfo = await api.getThreadInfo(event.threadID);

      const threadName = threadInfo.threadName || "Unnamed Group";
      const threadID = event.threadID;
      const emoji = threadInfo.emoji || "❌ Not set";
      const imageSrc = threadInfo.imageSrc || null;
      const approvalMode = threadInfo.approvalMode ? "ON" : "OFF";
      const adminIDs = threadInfo.adminIDs.map(admin => admin.id);
      const adminList = threadInfo.userInfo
        .filter(user => adminIDs.includes(user.id))
        .map(user => `• ${user.name} (${user.id})`);

      const members = threadInfo.participantIDs.length;
      const genderStats = threadInfo.userInfo.reduce((acc, user) => {
        if (user.gender === 'MALE') acc.male++;
        else if (user.gender === 'FEMALE') acc.female++;
        else acc.unknown++;
        return acc;
      }, { male: 0, female: 0, unknown: 0 });

      const messageCount = threadInfo.messageCount?.toLocaleString() || "Unknown";
      const nicknames = threadInfo.nicknames
        ? Object.entries(threadInfo.nicknames).map(([id, nick]) => {
            const name = threadInfo.userInfo.find(user => user.id === id)?.name || id;
            return `• ${name}: ${nick}`;
          })
        : [];

      const body = 
`===== [ GROUP INFO ] =====

• Name: ${threadName}
• ID: ${threadID}
• Emoji: ${emoji}
• Approval Mode: ${approvalMode}

===== [ MEMBERS ] =====

• Total: ${members}
• Male: ${genderStats.male}
• Female: ${genderStats.female}
• Unknown: ${genderStats.unknown}

===== [ ADMINS (${adminList.length}) ] =====
${adminList.join("\n") || "No admins found"}

===== [ STATS ] =====

• Total Messages: ${messageCount}

===== [ NICKNAMES ] =====
${nicknames.join("\n") || "None set"}

`;

      if (imageSrc) {
        const imgRes = await axios.get(imageSrc, { responseType: "stream" });
        return message.reply({ body, attachment: imgRes.data });
      } else {
        return message.reply(body);
      }

    } catch (error) {
      console.error(error);
      return message.reply("❌ An error occurred while fetching group info.");
    }
  }
};
