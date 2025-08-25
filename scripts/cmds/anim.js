const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "anim",
    aliases: ["ghibli"],
    version: "1.0",
    author: "ItachiInx1de",
    countDown: 5,
    role: 0,
    shortDescription: "Convert image into Studio Ghibli style anime",
    longDescription: "Reply to an image or provide an image URL to generate a Studio Ghibli-style anime version.",
    category: "ai",
    guide: "{pn} <image_url> (or reply to an image)"
  },

  onStart: async function ({ message, args, event, api }) {
    try {
      let imageUrl;

      // Reply to an image
      if (event.messageReply && event.messageReply.attachments?.length > 0) {
        imageUrl = event.messageReply.attachments[0].url;
      }

      // Direct URL input
      if (!imageUrl && args.length > 0) {
        imageUrl = args[0];
      }

      if (!imageUrl) {
        return message.reply("❌ Please reply to an image or provide an image URL.");
      }

      // React loading
      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      // API call
      const apiUrl = `https://ghibli-api-itachi.vercel.app/api/ghibli?url=${encodeURIComponent(imageUrl)}`;
      const { data } = await axios.get(apiUrl);

      if (!data.success) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply(`❌ API Error: ${data.error || "Unknown"}`);
      }

      const outputUrl = data.output;
      const tempFile = path.join(__dirname, "cache", `anim_${Date.now()}.jpg`);

      // Download image
      const imgRes = await axios.get(outputUrl, { responseType: "arraybuffer" });
      await fs.outputFile(tempFile, imgRes.data);

      // React success
      api.setMessageReaction("✅", event.messageID, () => {}, true);

      // Reply with image only
      await message.reply({
        body: `💗 | Here’s your anime image:`,
        attachment: fs.createReadStream(tempFile)
      });

      // Cleanup
      fs.unlinkSync(tempFile);

    } catch (err) {
      console.error(err);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      message.reply(`❌ Error: ${err.message}`);
    }
  }
};
