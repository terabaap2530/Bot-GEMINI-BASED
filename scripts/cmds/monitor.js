const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "monitor",
    aliases: ["m"],
    version: "1.2",
    author: "Denish",
    role: 0,
    shortDescription: { en: "Displays bot uptime, ping, and a random anime image." },
    longDescription: { en: "Shows how long the bot has been running, current ping, plus a random anime image." },
    category: "info",
    guide: { en: "Use {p}monitor to check uptime, ping, and get a random anime image." }
  },

  onStart: async function ({ api, event }) {
    const startTime = Date.now();

    try {
      // List of anime search keywords
      const searchList = ["lelouch", "tanjiro", "ashta", "ichigo", "aizen", "luffy", "zoro"];
      const randomSearch = searchList[Math.floor(Math.random() * searchList.length)];

      // Build Pinterest API URL
      const apiUrl = `https://www.bhandarimilan.info.np/api/pinterest?query=${encodeURIComponent(randomSearch)}`;

      // Fetch image URLs array (strings)
      const res = await axios.get(apiUrl, { timeout: 10000 });
      const images = res.data?.data || [];

      if (!images.length) {
        return api.sendMessage("❌ No images found from Pinterest API.", event.threadID, event.messageID);
      }

      // Pick random image URL string directly
      const imageUrl = images[Math.floor(Math.random() * images.length)];

      if (!imageUrl || !imageUrl.startsWith("http")) {
        return api.sendMessage("❌ Invalid image URL received.", event.threadID, event.messageID);
      }

      // Download image buffer
      const imgResponse = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 15000 });

      // Save image locally
      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const imgPath = path.join(cacheDir, "monitor_image.jpg");
      await fs.outputFile(imgPath, imgResponse.data);

      // Calculate uptime
      const uptimeSec = process.uptime();
      const days = Math.floor(uptimeSec / 86400);
      const hours = Math.floor((uptimeSec / 3600) % 24);
      const minutes = Math.floor((uptimeSec / 60) % 60);
      const seconds = Math.floor(uptimeSec % 60);

      let uptimeStr = `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
      if (days === 0) uptimeStr = `${hours} hours, ${minutes} minutes, ${seconds} seconds`;
      if (hours === 0 && days === 0) uptimeStr = `${minutes} minutes, ${seconds} seconds`;
      if (minutes === 0 && hours === 0 && days === 0) uptimeStr = `${seconds} seconds`;

      // Calculate ping
      const ping = Date.now() - startTime;

      // Send message with image attachment
      await api.sendMessage(
        {
          body: `👋 Hello! Your bot has been running for:\n${uptimeStr}\n\n📡 Current Ping: ${ping}ms\n🎨 Random Anime Pic: *${randomSearch.charAt(0).toUpperCase() + randomSearch.slice(1)}*`,
          attachment: fs.createReadStream(imgPath),
        },
        event.threadID,
        event.messageID
      );

      // Clean up cached image file
      await fs.unlink(imgPath).catch(() => {});

    } catch (error) {
      console.error("Monitor command error:", error);
      return api.sendMessage("⚠️ An error occurred while fetching the monitor info.", event.threadID, event.messageID);
    }
  },
};
