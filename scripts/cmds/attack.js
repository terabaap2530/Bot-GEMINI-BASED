‎const fs = require("fs");
‎const path = require("path");
‎const axios = require("axios");
‎
‎const warJsonPath = path.join(__dirname, "atck.json");
‎
‎function readWarJson() {
‎  try {
‎    return JSON.parse(fs.readFileSync(warJsonPath, "utf8"));
‎  } catch {
‎    return {};
‎  }
‎}
‎
‎function writeWarJson(data) {
‎  fs.writeFileSync(warJsonPath, JSON.stringify(data, null, 2));
‎}
‎
‎// Load enabled users (store UIDs)
‎let enabledUsers = [];
‎const warData = readWarJson();
‎if (warData.uids) enabledUsers = warData.uids;
‎
‎// Only owner can manage targets
‎const ownerUid = "100072165005153";
‎const ownerName = "Ryukazi";
‎
‎module.exports = {
‎  config: {
‎    name: "attack",
‎    version: "7.1",
‎    author: ownerName,
‎    countDown: 5,
‎    role: 0,
‎    shortDescription: "Auto-roast specific users",
‎    longDescription: "Enable or disable auto-roast for specific users by name or mention.",
‎    category: "fun",
‎    guide: {
‎      en: "{p}attack <name or mention> on — enable roasting\n{p}attack <name or mention> off — disable roasting"
‎    }
‎  },
‎
‎  onStart: async function ({ api, event, args }) {
‎    const senderId = event.senderID.toString();
‎    if (senderId !== ownerUid) {
‎      return api.sendMessage("❌ Only the owner can run this command.", event.threadID, event.messageID);
‎    }
‎
‎    const action = args[args.length - 1]?.toLowerCase(); // last argument is on/off
‎    if (!action || !["on", "off"].includes(action)) {
‎      return api.sendMessage("⚠️ Invalid action. Use on/off.", event.threadID, event.messageID);
‎    }
‎
‎    let targetId;
‎    let targetName;
‎
‎    // Check if there is a mention in the message
‎    if (event.mentions && Object.keys(event.mentions).length > 0) {
‎      targetId = Object.keys(event.mentions)[0]; // take first mention
‎      targetName = event.mentions[targetId];
‎    } else {
‎      // If no mention, use typed name as key (store as string)
‎      targetName = args.slice(0, args.length - 1).join(" ");
‎      targetId = targetName;
‎    }
‎
‎    if (action === "on") {
‎      if (!enabledUsers.includes(targetId)) {
‎        enabledUsers.push(targetId);
‎        writeWarJson({ uids: enabledUsers });
‎      }
‎      return api.sendMessage(`😈 Auto-roast enabled for ${targetName}`, event.threadID, event.messageID);
‎    }
‎
‎    if (action === "off") {
‎      enabledUsers = enabledUsers.filter(u => u !== targetId);
‎      writeWarJson({ uids: enabledUsers });
‎      return api.sendMessage(`👿 Auto-roast disabled for ${targetName}`, event.threadID, event.messageID);
‎    }
‎  },
‎
‎  onChat: async function ({ api, event }) {
‎    const senderId = event.senderID.toString();
‎    const senderName = event.senderName || "Friend";
‎
‎    // Only roast enabled users
‎    if (!enabledUsers.includes(senderId) && !enabledUsers.includes(senderName)) return;
‎
‎    try {
‎      const res = await axios.get(`https://fyuk.vercel.app/roast?name=${encodeURIComponent(senderName)}`, {
‎        timeout: 4000
‎      });
‎
‎      const roast = res.data?.roast?.trim();
‎      if (!roast) throw new Error("Empty roast");
‎
‎      await api.sendMessage(roast, event.threadID, event.messageID);
‎    } catch (err) {
‎      try {
‎        const fallback = await axios.get("https://evilinsult.com/generate_insult.php?lang=en&type=json");
‎        const insult = fallback.data.insult;
‎        await api.sendMessage(`${senderName}, ${insult}`, event.threadID, event.messageID);
‎      } catch {
‎        await api.sendMessage(`❌ Failed to fetch roast for ${senderName}`, event.threadID, event.messageID);
‎      }
‎    }
‎  }
‎};
‎
