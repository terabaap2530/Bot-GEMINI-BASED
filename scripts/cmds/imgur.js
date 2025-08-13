const axios = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");

module.exports = {
  config: {
    name: "imgur",
    aliases: ["i"],
    version: "2.1",
    author: "Lord Denish",
    countDown: 5,
    role: 0,
    shortDescription: "Upload replied image/GIF to your ImgBB album",
    longDescription: "Reply to an image or GIF and get a public link in your ImgBB album",
    category: "media",
    guide: {
      en: "{pn} (reply to an image/GIF)"
    }
  },

  onStart: async function ({ api, message, event }) {
    if (!event.messageReply || !event.messageReply.attachments || event.messageReply.attachments[0]?.type !== "photo") {
      return message.reply("❌ Please reply to an image or GIF.");
    }

    const imageUrl = event.messageReply.attachments[0].url;
    const tempFile = path.join(__dirname, "cache", `img_${Date.now()}.jpg`);

    try {
      api.setMessageReaction("❤️", event.messageID, () => {}, true);

      // Download the replied image
      const response = await axios.get(imageUrl, { responseType: "stream" });
      const writer = fs.createWriteStream(tempFile);
      response.data.pipe(writer);
      await new Promise(res => writer.on("finish", res));

      // Upload to your ImgBB album
      const imgbbApiKey = "31ac2c2e56a77032dc871c896f95bc3d"; // your API key
      const imgbbAlbum = "sj2PNx"; // your album ID
      const form = new FormData();
      form.append("image", fs.createReadStream(tempFile));
      form.append("album", imgbbAlbum);

      const imgbbRes = await axios.post(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, form, {
        headers: form.getHeaders()
      });

      fs.unlinkSync(tempFile);

      if (!imgbbRes.data || !imgbbRes.data.data || !imgbbRes.data.data.url) {
        api.setMessageReaction("💔", event.messageID, () => {}, true);
        return message.reply("❌ Failed to upload image to your album.");
      }

      const publicUrl = imgbbRes.data.data.url;

      await message.reply({
        body: `✅ I\nImage uploaded to your ImgBB album:\n${publicUrl}`
      });

      api.setMessageReaction("✨", event.messageID, () => {}, true);

    } catch (err) {
      api.setMessageReaction("💔", event.messageID, () => {}, true);
      message.reply(`❌ Error: ${err.message}`);
    }
  }
};
