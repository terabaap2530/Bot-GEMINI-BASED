const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "qrcode",
    aliases: ["qr", "makeqr"],
    version: "1.3",
    author: "Lord Denish",
    countDown: 5,
    role: 0,
    shortDescription: "Generate QR codes",
    longDescription: "Create a QR code from text, replied text, or replied media (image, video, sticker, gif).",
    category: "tools",
    guide: {
      en: "{pn} <text>\nReply to text, image, video, sticker, or gif with {pn}"
    }
  },

  onStart: async function ({ api, event, args }) {
    try {
      let text = args.join(" ");

      // If replying to a message
      if (event.type === "message_reply") {
        const reply = event.messageReply;

        if (reply.attachments?.length > 0) {
          const attachment = reply.attachments[0];

          // Handle all attachment types
          if (
            ["photo", "video", "sticker", "animated_image"].includes(
              attachment.type
            )
          ) {
            text = attachment.url;
          }
        } else if (reply.body) {
          text = reply.body; // replied text
        }
      }

      if (!text) {
        return api.sendMessage(
          "❌ Please provide text or reply to a message/media.\n\nExample: qrcode Hello World",
          event.threadID,
          event.messageID
        );
      }

      // API URL
      const apiUrl = `https://kaiz-apis.gleeze.com/api/qrcode-generator?text=${encodeURIComponent(
        text
      )}&apikey=ed9ad8f5-3f66-4178-aec2-d3ab4f43ad0d`;

      // Temp file path
      const filePath = path.join(
        __dirname,
        "cache",
        `qrcode_${Date.now()}.png`
      );

      // Download QR code
      const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(filePath, response.data);

      // Send result
      await api.sendMessage(
        {
          body: `✅ QR code generated!\n\nContent: ${text}`,
          attachment: fs.createReadStream(filePath),
        },
        event.threadID,
        event.messageID
      );

      // Cleanup temp file
      setTimeout(() => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }, 60 * 1000);
    } catch (err) {
      console.error(err);
      api.sendMessage(
        "⚠️ Failed to generate QR code. Please try again later.",
        event.threadID,
        event.messageID
      );
    }
  },
};
