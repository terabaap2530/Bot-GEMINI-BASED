const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

// Safe wrappers
if (!process.stderr.clearLine) process.stderr.clearLine = () => {};
if (!process.stderr.cursorTo) process.stderr.cursorTo = () => {};

module.exports = {
  config: {
    name: "hostvideo",
    version: "1.7",
    author: "Lord Denish",
    role: 0,
    shortDescription: { en: "Host replied video to GitHub & return link" },
    longDescription: { en: "Uploads a video replied to by the user to your GitHub repo and returns the raw link." },
    category: "host",
    guide: {
      en: "{p}hostvideo\nReply to a video message to host it."
    }
  },

  onStart: async function ({ api, event }) {
    try {
      if (!event.messageReply || !event.messageReply.attachments || event.messageReply.attachments.length === 0) {
        return api.sendMessage("❌ Please reply to a video message!", event.threadID);
      }

      const videoAttachment = event.messageReply.attachments.find(att => att.type === "video");
      if (!videoAttachment) return api.sendMessage("❌ No video found!", event.threadID);

      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      const fileName = `video-${Date.now()}.mp4`;
      const tempPath = path.join(__dirname, "cache", fileName);
      await fs.ensureDir(path.join(__dirname, "cache"));

      // Download video
      const response = await axios.get(videoAttachment.url, { responseType: "arraybuffer" });
      await fs.outputFile(tempPath, response.data);

      // Prepare GitHub upload
      const OWNER = "Ryukazi";
      const REPO = "video-hosting";
      const BRANCH = "main";
      const TOKEN = "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"; // Must have repo permissions

      const content = fs.readFileSync(tempPath, { encoding: "base64" });

      // Use GitHub REST API via axios
      await axios.put(
        `https://api.github.com/repos/${OWNER}/${REPO}/contents/videos/${fileName}`,
        {
          message: `Add ${fileName}`,
          content: content,
          branch: BRANCH
        },
        {
          headers: {
            Authorization: `token ${TOKEN}`,
            "User-Agent": "hostvideo-bot"
          }
        }
      );

      fs.unlinkSync(tempPath);

      const rawLink = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/videos/${fileName}`;
      api.sendMessage(`✅ Video hosted successfully!\nLink: ${rawLink}`, event.threadID);
      api.setMessageReaction("🥳", event.messageID, () => {}, true);

    } catch (err) {
      console.error("❌ Error:", err.message);
      api.setMessageReaction("🖕", event.messageID, () => {}, true);
      api.sendMessage(`❌ Hosting failed!\nError: ${err.message}`, event.threadID);
    }
  }
};
