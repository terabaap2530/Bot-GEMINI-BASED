const PastebinAPI = require('pastebin-js');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "bin",
    version: "1.1",
    author: "Lord Itachi", // changed as per your preferred author name
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "📤 Upload a file to Pastebin"
    },
    longDescription: {
      en: "Uploads any file from the 'cmds' folder to Pastebin and returns the raw link."
    },
    category: "owner",
    guide: {
      en: "⚙️ Usage: {p}bin <filename>\nExample: {p}bin autodl"
    }
  },

  onStart: async function ({ api, event, args }) {
    const pastebin = new PastebinAPI({
      api_dev_key: 'LFhKGk5aRuRBII5zKZbbEpQjZzboWDp9'
    });

    if (!args[0]) {
      return api.sendMessage("❌ Please provide a filename.\nExample: bin autodl", event.threadID);
    }

    const rawName = args[0].replace(/\.js$/, ''); // remove .js if provided
    const filePath = path.join(__dirname, '..', 'cmds', `${rawName}.js`);

    if (!fs.existsSync(filePath)) {
      return api.sendMessage("❌ File not found in 'cmds' folder. Check the name again.", event.threadID);
    }

    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');

      const url = await pastebin.createPaste({
        text: fileContent,
        title: rawName,
        format: null,
        privacy: 1
      });

      const rawLink = url.replace("pastebin.com", "pastebin.com/raw");
      return api.sendMessage(`✅ Uploaded to Pastebin:\n🔗 ${rawLink}`, event.threadID);

    } catch (err) {
      console.error("Pastebin Upload Error:", err);
      return api.sendMessage("❌ Failed to upload. Pastebin error occurred.", event.threadID);
    }
  }
};
