const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "waiko",
    aliases: ["w"],
    version: "1.3",
    author: "Denish (Owner)",
    role: 0,
    shortDescription: "Sends a random waifu or neko image (admin only)",
    longDescription: "Fetches a random waifu or neko image from your API and sends it as attachment, showing the category. Only admin/owner can use it.",
    category: "fun"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, senderID } = event;

    // ✅ Admin/Owner UID
    const allowedUID = "100029144730729"; // Replace with your UID
    if (senderID !== allowedUID) {
      return api.sendMessage("❌ You are not allowed to use this command.", threadID);
    }

    try {
      // Decide API based on command or argument
      let apiUrl;
      if (args[0] === "waifu" || event.body.toLowerCase().includes("waifu")) {
        apiUrl = "https://dens-waifu.vercel.app/api/waifu";
      } else if (args[0] === "neko" || event.body.toLowerCase().includes("neko")) {
        apiUrl = "https://dens-waifu.vercel.app/api/neko";
      } else {
        // Random choice if nothing specified
        apiUrl = Math.random() < 0.5
          ? "https://dens-waifu.vercel.app/api/waifu"
          : "https://dens-waifu.vercel.app/api/neko";
      }

      // Fetch image
      const res = await axios.get(apiUrl);
      const { image, category } = res.data; // Get category from API response

      // Download image to temp folder
      const imgPath = path.join(__dirname, `temp_image_${Date.now()}.jpg`);
      const imgRes = await axios.get(image, { responseType: "arraybuffer" });
      await fs.outputFile(imgPath, imgRes.data);

      // Send image with category info
      await api.sendMessage(
        { body: `Category: ${category}`, attachment: fs.createReadStream(imgPath) },
        threadID,
        () => {
          fs.unlink(imgPath).catch(() => {}); // Clean up temp file
        }
      );

    } catch (error) {
      console.error("❌ Waiko command error:", error);
      await api.sendMessage("❌ Failed to fetch waifu/neko image.", threadID);
    }
  }
};
