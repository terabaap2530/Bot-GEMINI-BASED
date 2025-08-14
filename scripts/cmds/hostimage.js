const axios = require("axios");

module.exports = {
  config: {
    name: "hostimage",
    aliases: ["hi", "imgup"],
    version: "1.1",
    author: "Lord Denish",
    role: 0,
    shortDescription: { en: "Host your image and get a link" },
    longDescription: { en: "Upload an image to GitHub repo and return the hosted link" },
    category: "Utility",
  },

  onStart: async () => {
    console.log("hostimage command loaded!");
  },

  run: async ({ message }) => {
    try {
      let reply = message.replyMessage;
      if (!reply || !reply.attachments || reply.attachments.length === 0) {
        return message.reply("❌ Please reply to an image to host it.");
      }

      const image = reply.attachments[0];
      if (!image.url || !image.filename.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return message.reply("❌ Only image files (jpg, png, gif) are allowed.");
      }

      const imageData = await axios.get(image.url, { responseType: "arraybuffer" });
      const fileName = image.filename;
      const base64Image = Buffer.from(imageData.data).toString("base64");

      // GitHub repo details
      const GITHUB_TOKEN = "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";
      const REPO = "Ryukazi/host-image";
      const BRANCH = "main";
      const PATH = `images/${fileName}`;
      const githubApi = `https://api.github.com/repos/${REPO}/contents/${PATH}`;

      // Upload image
      let response;
      try {
        response = await axios.put(
          githubApi,
          { message: `Upload ${fileName}`, content: base64Image, branch: BRANCH },
          { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
        );
      } catch (err) {
        // If folder doesn't exist, create a dummy .gitkeep file first
        if (err.response && err.response.status === 422) {
          const folderPath = "images/.gitkeep";
          await axios.put(
            `https://api.github.com/repos/${REPO}/contents/${folderPath}`,
            { message: "Create images folder", content: Buffer.from("").toString("base64"), branch: BRANCH },
            { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
          );
          // Retry image upload
          response = await axios.put(
            githubApi,
            { message: `Upload ${fileName}`, content: base64Image, branch: BRANCH },
            { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
          );
        } else throw err;
      }

      const hostedLink = response.data.content.download_url;
      message.reply(`✅ Image hosted successfully:\n${hostedLink}`);
    } catch (err) {
      console.error(err);
      message.reply("❌ Failed to host image. Make sure the bot has proper access.");
    }
  },
};
