const axios = require("axios");

module.exports = {
  config: {
    name: "uptime",
    aliases: ["runtime", "up"],
    version: "1.2",
    author: "(Axshu)",
    countDown: 3,
    role: 0,
    shortDescription: "Shows bot uptime with a random anime image",
    longDescription: "Displays how long the bot has been running and sends a random anime picture.",
    category: "system",
    guide: "{pn}"
  },

  onStart: async function ({ api, event }) {
    const { threadID } = event;

    // Calculate uptime
    const uptimeInSeconds = process.uptime();
    const days = Math.floor(uptimeInSeconds / (60 * 60 * 24));
    const hours = Math.floor((uptimeInSeconds % (60 * 60 * 24)) / (60 * 60));
    const minutes = Math.floor((uptimeInSeconds % (60 * 60)) / 60);
    const seconds = Math.floor(uptimeInSeconds % 60);

    const formattedUptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    const message = `THE BOT IS RUNNING FOR 🤷, 🫶🏻💗\n\n(•_•)??\n\n${formattedUptime}`;

    try {
      // Fetch random anime image from an API
      const response = await axios.get("https://api.waifu.pics/sfw/waifu", { responseType: "json" });
      const imageUrl = response.data.url;

      // Download image as a stream
      const imgStream = (await axios.get(imageUrl, { responseType: "stream" })).data;

      api.sendMessage({ body: message, attachment: imgStream }, threadID);
    } catch (error) {
      console.error("❌ Failed to fetch anime image:", error);
      api.sendMessage(message, threadID);
    }
  }
};
