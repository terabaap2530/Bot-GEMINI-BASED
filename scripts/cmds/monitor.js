const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "monitor",
    aliases: ["m"],
    version: "1.3",
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
      // Anime search keywords
      const searchList = ["lelouch", "tanjiro", "ichigo", "aizen", "luffy", "zoro"];
      const randomSearch = searchList[Math.floor(Math.random() * searchList.length)];

      // Build new Pinterest API URL
      const apiUrl = `https://denish-pin.vercel.app/api/search-download?query=${encodeURIComponent(randomSearch)}`;

      // Fetch from your new API
      const res = await axios.get(apiUrl, { timeout: 15000 });

      // API returns { count, data: [ ...urls ], author: {...} }
      const images = res.data?.data || [];

      if (!images.length) {
        return api.sendMessage("❌ No images found from new Pinterest API.", event.threadID, event.messageID);
      }

      // Pick a random image URL
      const imageUrl = images[Math.floor(Math.random() * images.length)];

      if (!imageUrl || !imageUrl.startsWith("http")) {
        return api.sendMessage("❌ Invalid image URL received.", event.threadID, event.messageID);
      }

      // Download image
      const imgResponse = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 20000 });

      // Save to cache
      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const imgPath = path.join(cacheDir, "monitor_image.jpg");
      await fs.outputFile(imgPath, imgResponse.data);

      // Uptime calculation
      const uptimeSec = process.uptime();
      const days = Math.floor(uptimeSec / 86400);
      const hours = Math.floor((uptimeSec / 3600) % 24);
      const minutes = Math.floor((uptimeSec / 60) % 60);
      const seconds = Math.floor(uptimeSec % 60);

      let uptimeStr = `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
      if (days === 0) uptimeStr = `${hours} hours, ${minutes} minutes, ${seconds} seconds`;
      if (hours === 0 && days === 0) uptimeStr = `${minutes} minutes, ${seconds} seconds`;
      if (minutes === 0 && hours === 0 && days === 0) uptimeStr = `${seconds} seconds`;

      // Ping calculation
      const ping = Date.now() - startTime;

      // Send message
      await api.sendMessage(
        {
          body: `👋 Hello! Your bot has been running for:\n${uptimeStr}\n\n📡 Current Ping: ${ping}ms\n🎨 Random Anime Pic: *${randomSearch.charAt(0).toUpperCase() + randomSearch.slice(1)}*`,
          attachment: fs.createReadStream(imgPath),
        },
        event.threadID,
        event.messageID
      );

      // Clean up
      await fs.unlink(imgPath).catch(() => {});

    } catch (error) {
      console.error("Monitor command error:", error.message || error);
      return api.sendMessage("⚠️ An error occurred while fetching monitor info.", event.threadID, event.messageID);
    }
  },
};
