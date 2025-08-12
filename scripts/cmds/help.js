const axios = require("axios");

module.exports.config = {
  name: "help",
  version: "1.1",
  author: "Lord Denish",
  role: 0,
  shortDescription: "Show bot commands",
  longDescription: "Displays all commands with Pinterest image and uptime",
  category: "info",
  guide: "{p}help"
};

module.exports.onStart = async function ({ api, event, commandName }) {
  try {
    // Random Pinterest keywords
    const keywords = ["anime boy", "anime girl", "nature", "cyberpunk", "aesthetic", "wallpaper", "meme", "cool art"];
    const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];

    // Fetch Pinterest image
    const pinRes = await axios.get(`https://www.bhandarimilan.info.np/api/pinterest?query=${encodeURIComponent(randomKeyword)}`);
    const imageUrl = pinRes.data?.data?.[0] || null;
    if (!imageUrl) return api.sendMessage("❌ | Failed to fetch Pinterest image.", event.threadID, event.messageID);

    // Bot uptime
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;

    // Dynamically get all commands from your bot's commands map
    // Assuming your bot stores commands in global.GoatBot.commands as a Map or object
    const allCommands = global.GoatBot?.commands; // adjust this if your bot uses a different variable
    if (!allCommands) return api.sendMessage("❌ | Commands not found in bot.", event.threadID, event.messageID);

    // Group commands by category
    const categories = {};
    for (const [cmdName, cmdObj] of allCommands.entries()) {
      const category = cmdObj.config.category || "Uncategorized";
      if (!categories[category]) categories[category] = [];
      categories[category].push(cmdName);
    }

    // Format command list
    let commandList = "";
    for (const [category, cmds] of Object.entries(categories)) {
      commandList += `\n${category}:\n- ${cmds.sort().join("\n- ")}\n`;
    }

    // Final message
    const messageText = `✨ 𝗕𝗼𝘁 𝗛𝗲𝗹𝗽 𝗠𝗲𝗻𝘂 ✨\n\n${commandList}\n⏳ Uptime: ${uptimeStr}\n📸 Pinterest: ${randomKeyword}`;

    // Send with image
    const imgRes = await axios.get(imageUrl, { responseType: "stream" });
    api.sendMessage({ body: messageText, attachment: imgRes.data }, event.threadID, event.messageID);

  } catch (err) {
    console.error(err);
    api.sendMessage("❌ | Failed to fetch help or image.", event.threadID, event.messageID);
  }
};
