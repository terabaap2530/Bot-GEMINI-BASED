module.exports = {
  config: {
    name: "groups",
    version: "1.3",
    author: "Ajeet",
    role: 2,
    shortDescription: "Show only active groups where bot is present & leave selected group",
    longDescription: "List only active groups where bot is currently a member. Reply with number to select, confirm with ❤️ to leave.",
    category: "system",
    guide: {
      en: "{pn}"
    }
  },

  onStart: async function({ api, event }) {
    try {
      const botID = api.getCurrentUserID();
      const threads = await api.getThreadList(100, null, ["INBOX"]);

      // Sirf wahi groups jo active hai aur bot usme hai
      const activeGroups = [];
      for (const t of threads) {
        if (!t.isGroup) continue;
        const info = await api.getThreadInfo(t.threadID);
        if (info && info.participantIDs.includes(botID)) {
          activeGroups.push({ threadID: t.threadID, name: t.name || "Unnamed Group" });
        }
      }

      if (activeGroups.length === 0) {
        return api.sendMessage("⚠️ | Bot is not in any active groups.", event.threadID, event.messageID);
      }

      // Group list message
      let msg = "📜 Active Groups where bot is present:\n\n";
      activeGroups.forEach((g, i) => {
        msg += `${i + 1}. ${g.name}\n`;
      });
      msg += `\n👉 Reply with the number (1-${activeGroups.length}) to make bot leave that group.`;

      api.sendMessage(msg, event.threadID, (err, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: module.exports.config.name,
          messageID: info.messageID,
          author: event.senderID,
          groupList: activeGroups,
          type: "chooseGroup"
        });
      });
    } catch (e) {
      console.error(e);
      api.sendMessage("❌ | Error while fetching active groups.", event.threadID, event.messageID);
    }
  },

  onReply: async function({ api, event, Reply }) {
    if (event.senderID !== Reply.author) return;

    if (Reply.type === "chooseGroup") {
      const choice = parseInt(event.body);
      if (isNaN(choice) || choice < 1 || choice > Reply.groupList.length) {
        return api.sendMessage("⚠️ | Invalid choice, please reply with a valid number.", event.threadID, event.messageID);
      }

      const target = Reply.groupList[choice - 1];

      api.sendMessage(
        `⚠️ Are you sure master?\nBot will leave: ${target.name}\n\n👉 React ❤️ to confirm.`,
        event.threadID,
        (err, info) => {
          global.GoatBot.onReaction.set(info.messageID, {
            commandName: module.exports.config.name,
            messageID: info.messageID,
            author: event.senderID,
            target,
            type: "confirmLeave"
          });
        }
      );
    }
  },

  onReaction: async function({ api, event, Reaction }) {
    if (event.userID !== Reaction.author) return;
    if (Reaction.type !== "confirmLeave") return;

    if (event.reaction === "❤" || event.reaction === "❤️") {
      try {
        await api.removeUserFromGroup(api.getCurrentUserID(), Reaction.target.threadID);
        api.sendMessage(`✅ Bot successfully left group: ${Reaction.target.name}`, event.threadID);
      } catch (err) {
        console.error(err);
        api.sendMessage("❌ | Failed to leave the group.", event.threadID);
      }
    }
  }
};
