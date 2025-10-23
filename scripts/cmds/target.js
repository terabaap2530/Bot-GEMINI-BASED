const fs = require("fs");
const path = require("path");
const axios = require("axios");

const dataPath = path.join(__dirname, "atck.json");

function readData() {
  try {
    return JSON.parse(fs.readFileSync(dataPath, "utf8"));
  } catch {
    return { uids: [], names: {} };
  }
}

function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

let data = readData();
let enabled = data.uids || [];
let names = data.names || {};

const ownerUid = "100004730585694";
const apiBase = "https://custom-roast-api.vercel.app";

module.exports = {
  config: {
    name: "target",
    version: "7.7",
    author: "Axshu",
    role: 0,
    category: "fun",
    shortDescription: "Enable, disable, or list auto-roast users.",
    longDescription:
      "Owner can enable or disable auto-roast for any user by UID or mention. Use 'target list' to see all active targets. Works across all groups."
  },

  onStart: async function ({ api, event, args }) {
    if (event.senderID !== ownerUid)
      return api.sendMessage("❌ Only owner can use this command.", event.threadID, event.messageID);

    if (!args[0])
      return api.sendMessage("Use: target <UID|@mention> on/off/list", event.threadID, event.messageID);

    const action = args[0].toLowerCase();

    // ---- Show list ----
    if (action === "list") {
      if (enabled.length === 0)
        return api.sendMessage("📭 No active targets.", event.threadID, event.messageID);

      const list = enabled
        .map((id, i) => `${i + 1}. ${names[id] || "Unknown"} (UID: ${id})`)
        .join("\n");
      return api.sendMessage(`🎯 Active Targets:\n\n${list}`, event.threadID, event.messageID);
    }

    // ---- Enable/disable ----
    if (!args[1])
      return api.sendMessage("Use: target <UID|@mention> on/off", event.threadID, event.messageID);

    let targetId, name;
    let mode = args[1].toLowerCase();

    if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetId = Object.keys(event.mentions)[0];
      name = Object.values(event.mentions)[0].replace(/@/g, "");
    } else {
      targetId = args[0].replace(/\D/g, "");
      name = args.slice(2).join(" ") || "User";
    }

    if (!targetId) return api.sendMessage("Invalid UID or mention.", event.threadID, event.messageID);

    if (mode === "on") {
      if (!enabled.includes(targetId)) enabled.push(targetId);
      names[targetId] = name;
      saveData({ uids: enabled, names });
      return api.sendMessage(`😈 Target ON: ${name}`, event.threadID, event.messageID);
    }

    if (mode === "off") {
      enabled = enabled.filter(u => u !== targetId);
      delete names[targetId];
      saveData({ uids: enabled, names });
      return api.sendMessage(`👿 Target OFF: ${name}`, event.threadID, event.messageID);
    }

    return api.sendMessage("Use: target <UID|@mention> on/off/list", event.threadID, event.messageID);
  },

  onChat: async function ({ api, event }) {
    const id = event.senderID;
    if (!enabled.includes(id)) return;

    const name = names[id] || "Friend";
    try {
      const res = await axios.get(`${apiBase}/?name=${encodeURIComponent(name)}`);
      const roast = res.data?.roast?.trim();
      if (roast) await api.sendMessage(roast, event.threadID, event.messageID);
    } catch {
      await api.sendMessage(`❌ Roast failed for ${name}`, event.threadID, event.messageID);
    }
  }
};
