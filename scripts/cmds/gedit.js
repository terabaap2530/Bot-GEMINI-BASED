const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "gedit",
    aliases: ["imageedit", "imggen", "genedit"],
    version: "1.0",
    author: "TawsiN",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Generate or edit an image using a prompt"
    },
    longDescription: {
      en: "Use this command to generate a new image or edit an image you've replied to, using a text prompt.\n🧠 Powered by API from Rifat."
    },
    category: "image",
    guide: {
      en: "{p}gedit <prompt> (reply to an image to edit)"
    }
  },

  onStart: async function ({ message, event, args }) {
    const prompt = args.join(" ");
    const repliedAttachment = event.messageReply?.attachments?.[0];
    const isEditing = repliedAttachment?.type === "photo";

    if (!prompt) {
      return message.reply("⚠️ Please provide a prompt to generate or edit an image.");
    }

    const fileName = `gedit_${Date.now()}.jpg`;
    const filePath = path.join(__dirname, "cache", fileName);

    // React with ⏳ to indicate processing
    await message.reaction("⏳");

    try {
      const baseURL = "https://edit-and-gen.onrender.com/gen";
      const apiURL = isEditing
        ? `${baseURL}?prompt=${encodeURIComponent(prompt)}&image=${encodeURIComponent(repliedAttachment.url)}`
        : `${baseURL}?prompt=${encodeURIComponent(prompt)}`;

      const response = await axios.get(apiURL, { responseType: "arraybuffer" });
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, Buffer.from(response.data, "binary"));

      const statusText = isEditing ? "🪄 Edited" : "🎨 Generated";

      await message.reply({
        body: `${statusText} image for:\n📝 "${prompt}"`,
        attachment: fs.createReadStream(filePath)
      });

      // React with ✅ on success
      await message.reaction("✅");
    } catch (err) {
      console.error("[gedit] Error:", err);
      await message.reaction("❌");
      await message.reply("❌ Failed to generate or edit image. Please try again later.");
    } finally {
      await fs.remove(filePath);
    }
  }
};
