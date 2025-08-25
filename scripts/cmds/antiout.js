const fs = require("fs");
const path = __dirname + "/cache/antiout.json";

if (!fs.existsSync(path)) fs.writeFileSync(path, JSON.stringify({}));

module.exports = {
  config: {
    name: "antiout",
    aliases: ["aout"],
    version: "1.0",
    author: "Lord Denish",
    countDown: 5,
    role: 1,
    shortDescription: "Prevent members from leaving the group",
    longDescription: "Re-add members automatically if they leave the group.",
    category: "group",
    guide: "{pn} on\n{pn} off"
  },

  onStart: async function({ api, event, args }) {
    const data = JSON.parse(fs.readFileSync(path));
    const threadID = event.threadID;

    if (args[0] === "on") {
      data[threadID] = true;
      fs.writeFileSync(path, JSON.stringify(data, null, 2));
      return api.sendMessage("✅ Anti-Out has been enabled in this group.", threadID);
    } 
    else if (args[0] === "off") {
      data[threadID] = false;
      fs.writeFileSync(path, JSON.stringify(data, null, 2));
      return api.sendMessage("❌ Anti-Out has been disabled in this group.", threadID);
    } 
    else {
      return api.sendMessage("⚡ Usage: antiout on/off", threadID);
    }
  },

  onEvent: async function({ api, event }) {
    if (event.logMessageType === "log:unsubscribe") {
      const data = JSON.parse(fs.readFileSync(path));
      const threadID = event.threadID;
      if (data[threadID]) {
        try {
          const leftUser = event.logMessageData.leftParticipantFbId;
          await api.addUserToGroup(leftUser, threadID);
          api.sendMessage("⚠️ Someone tried to leave, but Anti-Out brought them back!", threadID);
        } catch (err) {
          console.error(err);
        }
      }
    }
  }
};
