const axios = require("axios");

module.exports = {
  config: {
    name: "fyp",
    aliases: [],
    version: "1.0",
    author: "Dens",
    countDown: 5,
    role: 0,
    shortDescription: "Random or keyword-based TikTok via your API",
    longDescription: "If keyword given, fetch that. Otherwise fetch random.",
    category: "fun",
    guide: "{p}fyp [keyword]"
  },

  onStart: async function({ api, event, args }) {
    try {
      let query = args.join(" ");
      if (!query) {
        // If no keyword, use a random fallback — maybe “fyp” or some default term
        query = "fyp";  
      }

      const url = `https://dens-fyp.vercel.app/api/fyp?q=${encodeURIComponent(query)}`;
      const res = await axios.get(url);
      const list = res.data.data;

      if (!list || list.length === 0) {
        return api.sendMessage("⚠️ | No videos found for that keyword.", event.threadID, event.messageID);
      }

      // pick random from the list
      const video = list[Math.floor(Math.random() * list.length)];

      // send only video (no watermark version)
      await api.sendMessage(
        {
          body: "",  // you want only video, so body can be blank or some minimal text
          attachment: await global.utils.getStreamFromURL(video.nowm)
        },
        event.threadID,
        event.messageID
      );

    } catch (err) {
      console.error("fyp command error:", err);
      return api.sendMessage("❌ | Failed to fetch video. Try again later.", event.threadID, event.messageID);
    }
  }
};
