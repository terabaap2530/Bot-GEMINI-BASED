const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "flux",
    version: "1.2",
    author: "Lord Denish",
    countDown: 20,
    role: 0,
    shortDescription: "AI Image Generator (FluxPro)",
    category: "image",
    guide: {
      en: "{pn} <prompt>"
    }
  },

  onStart: async function ({ message, args }) {
    const prompt = args.join(" ");
    if (!prompt)
      return message.reply("Please enter a prompt!");

    const apiUrl = `https://dens-fluxpro.vercel.app/denish?q=${encodeURIComponent(prompt)}`;
    const tempPath = path.join(__dirname, `cache/flux_${Date.now()}.png`);

    try {
      // Fetch raw image (stream or buffer)
      const response = await axios.get(apiUrl, {
        responseType: "arraybuffer",
        timeout: 90000 // 90s timeout in case API takes long
      });

      // Save to cache
      fs.writeFileSync(tempPath, Buffer.from(response.data));

      // Send only the image
      await message.reply({
        attachment: fs.createReadStream(tempPath)
      });

      // Clean up file
      fs.unlinkSync(tempPath);

    } catch (err) {
      console.error("❌ Flux API error:", err.message);
      message.reply("Failed to generate image. API might still be generating or slow.");
    }
  }
};
