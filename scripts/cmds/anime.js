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
    version: "1.1",
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

      const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
        timeout: 15000
      });

      const videoPath = path.join(__dirname, "cache", `anime_${Date.now()}.mp4`);
      await streamPipeline(response.data, fs.createWriteStream(videoPath));

      // Send video
      await api.sendMessage(
        { body: "✨ Here's your anime!", attachment: fs.createReadStream(videoPath) },
        event.threadID,
        () => {
          fs.unlinkSync(videoPath);
          // React after success
          api.setMessageReaction("✅", event.messageID, () => {}, true);
        },
        event.messageID
      );

    } catch (e) {
      console.error(e);
      api.sendMessage("❌ Failed to fetch anime video.", event.threadID, event.messageID);
      api.setMessageReaction("⚠️", event.messageID, () => {}, true);
    }
  }
};
