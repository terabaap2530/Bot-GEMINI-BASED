const axios = require("axios");

module.exports = {
  config: {
    name: "githubadd",
    aliases: ["ghadd", "addcmd", "updatecmd"],
    version: "2.0",
    author: "Denish",
    role: 2,
    shortDescription: "Add or update any cmd file on GitHub",
    longDescription: "Creates new command file OR updates existing command file in scripts/cmds/",
    category: "owner",
    guide: "{pn} <filename.js> <full code>"
  },

  onStart: async function ({ api, event, args }) {
    // Your GitHub secret token
    const token = "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";

    // Repo details
    const owner = "terabaap2530";
    const repo = "Bot-GEMINI-BASED";

    // Pull out filename + content
    const fileName = args.shift();
    const newCode = args.join(" ");

    if (!fileName || !newCode) {
      return api.sendMessage(
        "❗ Usage:\n.githubadd <filename.js> <your full JS code>",
        event.threadID,
        event.messageID
      );
    }

    const filePath = `scripts/cmds/${fileName}`;

    api.sendMessage(`⏳ Working on **${fileName}**…`, event.threadID);

    let sha = null;

    try {
      // Check if file exists → we need SHA to update
      const checkFile = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
        {
          headers: { Authorization: `token ${token}` }
        }
      );
      sha = checkFile.data.sha; // File exists → update
    } catch (error) {
      sha = null; // File does NOT exist → create
    }

    try {
      // CREATE or UPDATE file
      await axios.put(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
        {
          message: sha
            ? `Updated ${fileName} via bot command`
            : `Created ${fileName} via bot command`,
          content: Buffer.from(newCode).toString("base64"),
          sha: sha || undefined
        },
        {
          headers: { Authorization: `token ${token}` }
        }
      );

      api.sendMessage(
        `✅ Successfully **${sha ? "updated" : "created"}** ${fileName}`,
        event.threadID,
        event.messageID
      );
    } catch (err) {
      api.sendMessage(
        "❌ GitHub Error:\n" + err.message,
        event.threadID,
        event.messageID
      );
    }
  }
};
