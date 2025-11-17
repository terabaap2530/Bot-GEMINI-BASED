const axios = require("axios");
const path = require("path");

module.exports = {
  config: {
    name: "hostimage",
    aliases: ["hi", "imgup"],
    version: "1.5",
    author: "Lord Denish",
    role: 0,
    shortDescription: { en: "Host your image and get a link" },
    longDescription: { en: "Upload an image to GitHub repo and return the hosted link" },
    category: "Utility",
  },

  onStart: async function ({ message, event }) {
    try {
      const reply = message.reply_message || event.messageReply;
      if (!reply || !reply.attachments || reply.attachments.length === 0) {
        return message.reply("❌ Please reply to an image to host it.");
      }

      const image = reply.attachments[0];

      // Allowed extensions
      const allowedExt = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

      // Get extension from filename or type
      let ext = "";
      if (image.filename) {
        ext = path.extname(image.filename).toLowerCase();
      }
      if (!ext && image.type) {
        const mimeExt = {
          "image/jpeg": ".jpg",
          "image/png": ".png",
          "image/gif": ".gif",
          "image/webp": ".webp",
          "photo": ".jpg" // Messenger uses this for photos
        };
        ext = mimeExt[image.type.toLowerCase()] || ".jpg";
      }

      // Validate extension
      if (!allowedExt.includes(ext)) {
        return message.reply("❌ Only image files (jpg, jpeg, png, gif, webp) are allowed.");
      }

      const fileName = Date.now() + ext;
      await message.reply("⏳ Uploading image...");

      // Download image
      const imageData = await axios.get(image.url, { responseType: "arraybuffer" });
      const base64Image = Buffer.from(imageData.data).toString("base64");

      // GitHub details
      const GITHUB_TOKEN = "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";
      const REPO = "Ryukazi/host-image";
      const BRANCH = "main";
      const PATH = `image/${fileName}`;
      const githubApi = `https://api.github.com/repos/${REPO}/contents/${PATH}`;

      // Upload to GitHub
      await axios.put(
        githubApi,
        { message: `Upload ${fileName}`, content: base64Image, branch: BRANCH },
        { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
      );

      const hostedLink = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${PATH}`;
      message.reply(`✅ Image hosted successfully:\n${hostedLink}`);

    } catch (err) {
      console.error(err?.response?.data || err);
      message.reply("❌ Failed to host image. Check token and repo permissions.");
    }
  },
};
