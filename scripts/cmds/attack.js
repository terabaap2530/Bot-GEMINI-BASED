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
const ownerUid = "100029144730729";
const ownerName = "Axshu";

module.exports = {
  config: {
    name: "attack",
    version: "7.2",
    author: ownerName,
    countDown: 5,
    role: 0,
    shortDescription: "Auto-roast specific users",
    longDescription: "Enable or disable auto-roast for specific users by mention (only owner).",
    category: "fun",
    guide: {
      en: "{p}attack @mention on — enable roasting\n{p}attack @mention off — disable roasting"
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
    const targetName = event.mentions[targetId].replace(/@/g, "") || "User";

    if (action === "on") {
      if (!enabledUsers.includes(targetId)) {
        enabledUsers.push(targetId);
        writeWarJson({ uids: enabledUsers });
      }
      return api.sendMessage(`😈 Auto-roast enabled for ${targetName}`, event.threadID, event.messageID);
    }

    if (action === "off") {
      enabledUsers = enabledUsers.filter(u => u !== targetId);
      writeWarJson({ uids: enabledUsers });
      return api.sendMessage(`👿 Auto-roast disabled for ${targetName}`, event.threadID, event.messageID);
    }
  },

  // ---------- Chat handler ----------
  onChat: async function ({ api, event }) {
    const senderId = event.senderID.toString();
    const senderName = event.senderName || "Friend";

    if (!enabledUsers.includes(senderId)) return;

    try {
      const res = await axios.get(`https://fyuk.vercel.app/roast?name=${encodeURIComponent(senderName)}`, {
        timeout: 4000
      });

      const roast = res.data?.roast?.trim();
      if (!roast) throw new Error("Empty roast");

      await api.sendMessage(roast, event.threadID, event.messageID);
    } catch (err) {
      try {
        const fallback = await axios.get("https://evilinsult.com/generate_insult.php?lang=en&type=json");
        const insult = fallback.data.insult;
        await api.sendMessage(`${senderName}, ${insult}`, event.threadID, event.messageID);
      } catch {
        await api.sendMessage(`❌ Failed to fetch roast for ${senderName}`, event.threadID, event.messageID);
      }
    }
  }
};
