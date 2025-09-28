const fs = require("fs");
const path = require("path");
const axios = require("axios");

const warJsonPath = path.join(__dirname, "atck.json");

// ---------- JSON Helpers ----------
function readWarJson() {
  try {
    return JSON.parse(fs.readFileSync(warJsonPath, "utf8"));
  } catch {
    return { uids: [] };
  }
}

function writeWarJson(data) {
  fs.writeFileSync(warJsonPath, JSON.stringify(data, null, 2));
}

// Load enabled users (UIDs only)
let enabledUsers = readWarJson().uids || [];

// Owner info
const ownerUid = "61574791744025";
const ownerName = "Axshu";

// Store target names map { uid: name }
let targetNames = {};

// ---------- Roast API (configured) ----------
const ROAST_API_BASE = "https://custom-roast-api.vercel.app"; // <- set here

module.exports = {
  config: {
    name: "target",
    version: "7.3",
    author: ownerName,
    countDown: 5,
    role: 0,
    shortDescription: "Auto-roast specific users",
    longDescription: "Enable or disable auto-roast for specific users by mention (only owner).",
    category: "fun",
    guide: {
      en: "{p}target @mention on — enable roasting\n{p}target @mention off — disable roasting"
    }
  },

  // ---------- Command handler ----------
  onStart: async function ({ api, event, args }) {
    const senderId = event.senderID.toString();
    if (senderId !== ownerUid) {
      return api.sendMessage("❌ Only the owner can run this command.", event.threadID, event.messageID);
    }

    const action = args[args.length - 1]?.toLowerCase();
    if (!["on", "off"].includes(action)) {
      return api.sendMessage("⚠️ Invalid action. Use on/off.", event.threadID, event.messageID);
    }

    if (!event.mentions || Object.keys(event.mentions).length === 0) {
      return api.sendMessage("⚠️ Please mention a user.", event.threadID, event.messageID);
    }

    const targetId = Object.keys(event.mentions)[0]; // first mention UID
    // Mention entry might be string or object depending on platform; handle both
    const mentionEntry = event.mentions[targetId];
    const targetName = (typeof mentionEntry === "string" ? mentionEntry : (mentionEntry.name || ""))?.replace(/@/g, "") || "User";

    if (action === "on") {
      if (!enabledUsers.includes(targetId)) {
        enabledUsers.push(targetId);
        writeWarJson({ uids: enabledUsers });
      }
      targetNames[targetId] = targetName;
      return api.sendMessage(`😈 Auto-roast enabled for ${targetName}`, event.threadID, event.messageID);
    }

    if (action === "off") {
      enabledUsers = enabledUsers.filter(u => u !== targetId);
      writeWarJson({ uids: enabledUsers });
      delete targetNames[targetId];
      return api.sendMessage(`👿 Auto-roast disabled for ${targetName}`, event.threadID, event.messageID);
    }
  },

  // ---------- Chat handler ----------
  onChat: async function ({ api, event }) {
    const senderId = event.senderID.toString();
    if (!enabledUsers.includes(senderId)) return;

    const targetName = targetNames[senderId] || "Friend";

    try {
      // use configured API base
      const url = `${ROAST_API_BASE}/?name=${encodeURIComponent(targetName)}`;
      const res = await axios.get(url, { timeout: 5000 });

      const roast = res.data?.roast?.trim();
      if (!roast) throw new Error("Empty roast");

      await api.sendMessage(roast, event.threadID, event.messageID);
    } catch (err) {
      // improved error message for debugging
      const errMsg = (err && err.message) ? err.message : "Unknown error";
      await api.sendMessage(`❌ Failed to fetch roast for ${targetName} (${errMsg})`, event.threadID, event.messageID);
    }
  }
};
