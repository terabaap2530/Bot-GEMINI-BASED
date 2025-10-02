const axios = require("axios");
const { getPrefix } = global.utils;
const { commands, aliases } = global.GoatBot;

module.exports = {
  config: {
    name: "help",
    version: "2.0",
    author: "Lord Denish (merged from NTKhang)",
    role: 0,
    shortDescription: "Show bot commands",
    longDescription: "Displays all commands with Pinterest image and uptime",
    category: "info",
    guide: "{p}help / {p}help cmdName"
  },

  onStart: async function ({ api, event, args, role, threadsData }) {
    try {
      const { threadID } = event;
      const threadData = await threadsData.get(threadID);
      const prefix = getPrefix(threadID);

      // Bot uptime
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);
      const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;

      // Random Pinterest keywords
      const keywords = ["uriyu", "orihime", "ichigo", "boahancock", "zoro", "SWALLOWEDSTAR", "LUFFY", "Aizen"];
      const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];

      // 🔥 Updated API URL
      const pinRes = await axios.get(`https://denish-pin.vercel.app/api/search-download?query=${encodeURIComponent(randomKeyword)}`);
      const imageUrl = pinRes.data?.data?.[0] || null;

      // Case 1: Show full help list
      if (args.length === 0) {
        const categories = {};
        let msg = "";

        msg += `╔═══════════╗\n ★ 𝙃𝙚𝙮, 𝙄'𝙢 𝐀𝐱𝐬𝐡𝐮 GoatBot! 𝙋𝙧𝙚𝙛𝙞𝙭: ${prefix}\n ★ 𝙊𝙬𝙣𝙚𝙧: Lord Axshu\n╚═══════════╝\n`;

        for (const [name, value] of commands) {
          if (value.config.role > 1 && role < value.config.role) continue;
          const category = value.config.category || "Uncategorized";
          categories[category] = categories[category] || { commands: [] };
          categories[category].commands.push(name);
        }

        Object.keys(categories).forEach((category) => {
          if (category !== "info") {
            msg += `\n╭───────────\n│ 『 ${category.toUpperCase()} 』`;
            const names = categories[category].commands.sort();
            for (let i = 0; i < names.length; i += 3) {
              const cmds = names.slice(i, i + 3).map((item) => `✰${item}`);
              msg += `\n│ ${cmds.join("   ")}`;
            }
            msg += `\n╰────────────`;
          }
        });

        const totalCommands = commands.size;
        msg += `\n\n📌 Total Commands: ${totalCommands}\n⏳ Uptime: ${uptimeStr}\n📸 Pinterest: ${randomKeyword}\n\n👉 Type ${prefix}help <cmdName> to view details.\n🐐 | Ryuk4zi`;

        if (!imageUrl) return api.sendMessage(msg, threadID, event.messageID);

        const imgRes = await axios.get(imageUrl, { responseType: "stream" });
        return api.sendMessage({ body: msg, attachment: imgRes.data }, threadID, event.messageID);

      } else {
        // Case 2: Show command details
        const commandName = args[0].toLowerCase();
        const command = commands.get(commandName) || commands.get(aliases.get(commandName));

        if (!command) {
          return api.sendMessage(`❌ Command "${commandName}" not found.`, threadID, event.messageID);
        }

        const configCommand = command.config;
        const roleText = roleTextToString(configCommand.role);
        const author = configCommand.author || "Unknown";
        const longDescription = configCommand.longDescription ? configCommand.longDescription.en || "No description" : "No description";
        const guideBody = configCommand.guide?.en || "No guide available.";
        const usage = guideBody.replace(/{p}/g, prefix).replace(/{n}/g, configCommand.name);

        const response = `╭── NAME ────⭓
│ ${configCommand.name}
├── INFO
│ Description: ${longDescription}
│ Aliases: ${configCommand.aliases ? configCommand.aliases.join(", ") : "None"}
│ Version: ${configCommand.version || "1.0"}
│ Role: ${roleText}
│ Cooldown: ${configCommand.countDown || 1}s
│ Author: ${author}
├── Usage
│ ${usage}
╰────────────`;

        return api.sendMessage(response, threadID, event.messageID);
      }
    } catch (err) {
      console.error(err);
      return api.sendMessage("❌ | Failed to fetch help or image.", event.threadID, event.messageID);
    }
  }
};

function roleTextToString(roleText) {
  switch (roleText) {
    case 0: return "0 (All users)";
    case 1: return "1 (Group admins)";
    case 2: return "2 (Bot admin)";
    default: return "Unknown role";
  }
}
