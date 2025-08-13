const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

// Safe wrappers for environments
if (!process.stderr.clearLine) process.stderr.clearLine = () => {};
if (!process.stderr.cursorTo) process.stderr.cursorTo = () => {};

module.exports = {
  config: {
    name: "hostvideo",
    version: "1.4",
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
      // Make sure the user replied to a message
      if (!event.messageReply || !event.messageReply.attachments || event.messageReply.attachments.length === 0) {
        return api.sendMessage("❌ Please reply to a video message!", event.threadID);
      }

      // Find the video attachment
      const videoAttachment = event.messageReply.attachments.find(att => att.type === "video");
      if (!videoAttachment) return api.sendMessage("❌ No video found in the replied message!", event.threadID);

      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      const { Octokit } = await import("@octokit/rest"); // dynamic import for ES Module

      // Download video
      const fileName = `video-${Date.now()}.mp4`;
      const tempPath = path.join(__dirname, "cache", fileName);
      await fs.ensureDir(path.join(__dirname, "cache"));

      const response = await axios.get(videoAttachment.url, { responseType: "arraybuffer" });
      await fs.outputFile(tempPath, response.data);

      // Upload to GitHub
      const octokit = new Octokit({ auth: "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" });
      const OWNER = "Ryukazi";
      const REPO = "video-hosting";
      const BRANCH = "main";

      const content = fs.readFileSync(tempPath, { encoding: "base64" });
      await octokit.repos.createOrUpdateFileContents({
        owner: OWNER,
        repo: REPO,
        path: `videos/${fileName}`,
        message: `Add ${fileName}`,
        content,
        branch: BRANCH
      });

      fs.unlinkSync(tempPath); // remove temp file

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
