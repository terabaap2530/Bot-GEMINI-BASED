const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream");
const { promisify } = require("util");
const streamPipeline = promisify(pipeline);

module.exports = {
  config: {
    name: "anime",
    aliases: ["ae"],
    author: "Denish",
    version: "1.3",
    cooldowns: 5,
    role: 0,
    shortDescription: "Get random anime video",
    longDescription: "Fetches a random anime video from ran-animw API",
    category: "fun",
    guide: "{p}anime"
  },

  onStart: async function ({ api, event }) {
    const url = "https://ran-animw.vercel.app/api/denish";

    try {
      // React while fetching
      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      // Make sure cache folder exists
      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

      const videoPath = path.join(cacheDir, `anime_${Date.now()}.mp4`);

      // Fetch video stream
      const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
        timeout: 60000, // 1 min timeout for bigger files
        headers: { "User-Agent": "Mozilla/5.0" } // avoid blocks
      });

      // Save file
      await streamPipeline(response.data, fs.createWriteStream(videoPath));

      // Send file
      await api.sendMessage(
        { body: "✨ Here's your anime!", attachment: fs.createReadStream(videoPath) },
        event.threadID,
        () => {
          fs.unlinkSync(videoPath); // delete after sending
          api.setMessageReaction("✅", event.messageID, () => {}, true);
        },
        event.messageID
      );

    } catch (e) {
      console.error("Anime cmd error:", e);
      api.sendMessage("❌ Failed to fetch anime video.", event.threadID, event.messageID);
      api.setMessageReaction("⚠️", event.messageID, () => {}, true);
    }
  }
};
