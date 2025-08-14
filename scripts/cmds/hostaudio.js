const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "hostaudio",
    version: "1.2",
    author: "Lord Denish",
    role: 0,
    shortDescription: { en: "Host audio file on GitHub" },
    longDescription: { en: "Uploads an audio file to GitHub and returns the hosted link" },
    category: "media",
    guide: { en: "{pn} reply with an audio file" }
  },

  onStart: async function ({ message, event, api }) {
    try {
      if (!event.messageReply || !event.messageReply.attachments || event.messageReply.attachments.length === 0) {
        return message.reply("⚠ Please reply to an audio file.");
      }

      const file = event.messageReply.attachments[0];

      // Download file
      const fileBuffer = (await axios.get(file.url, { responseType: "arraybuffer" })).data;

      // Check size (max 25MB for GitHub)
      const fileSizeMB = fileBuffer.length / (1024 * 1024);
      if (fileSizeMB > 25) {
        return message.reply("⚠ File too large! Must be under 25MB for GitHub hosting.");
      }

      // Detect extension (default to .mp3 if unknown)
      let ext = path.extname(file.url);
      if (!ext) ext = ".mp3";

      // GitHub repo config
      const GITHUB_TOKEN = "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";
      const OWNER = "Ryukazi";
      const REPO = "Host-audio";
      const FILE_NAME = `audio_${Date.now()}${ext}`;
      const FILE_PATH = `audios/${FILE_NAME}`;

      const uploadUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;

      await axios.put(
        uploadUrl,
        {
          message: `Upload audio ${FILE_NAME}`,
          content: Buffer.from(fileBuffer).toString("base64")
        },
        {
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            "Content-Type": "application/json"
          }
        }
      );

      const rawLink = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${FILE_PATH}`;
      message.reply(`✅ Audio hosted successfully!\n🎵 ${rawLink}`);

    } catch (err) {
      console.error(err);
      message.reply("❌ Failed to host the audio file.");
    }
  }
};
