const axios = require("axios");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream");
const { promisify } = require("util");
const streamPipeline = promisify(pipeline);

module.exports = {
  config: {
    name: "video",
    aliases: ["v"],
    version: "2.0",
    author: "Lord Denish",
    countDown: 20,
    role: 0,
    shortDescription: { en: "Download YouTube videos as MP4" },
    description: "Search or provide a YouTube link and auto-download video as MP4.",
    category: "🎬 Media",
    guide: { en: "{pn} <video name or YouTube URL>" }
  },

  onStart: async function ({ api, message, args, event }) {
    if (api.setMessageReaction) api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const safeReply = async (text) => {
      try { await message.reply(text); } catch (e) { console.error("Failed to send reply:", e); }
    };

    try {
      if (!args.length) {
        if (api.setMessageReaction) api.setMessageReaction("⚠️", event.messageID, () => {}, true);
        return safeReply("⚠️ Provide a YouTube link or search term.");
      }

      const query = args.join(" ");

      // ✅ Use your new API
      const { data } = await axios.get(
        `https://dens-videojs.vercel.app/api/video?query=${encodeURIComponent(query)}`
      );

      if (!data?.status || !data?.result?.mp4) {
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return safeReply("❌ No video found.");
      }

      const downloadUrl = data.result.mp4;
      const title = data.result.title;

      // ✅ Download video
      const tempFileName = `video_${Date.now()}.mp4`;
      const tempPath = path.join(__dirname, tempFileName);

      const videoResponse = await axios({
        method: "get",
        url: downloadUrl,
        responseType: "stream",
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Referer": "https://www.youtube.com/",
          "Accept": "*/*"
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 180000
      });

      await streamPipeline(videoResponse.data, fs.createWriteStream(tempPath));

      // ✅ Send video
      await message.reply({ body: `🎬 ${title}`, attachment: fs.createReadStream(tempPath) });

      if (api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);

      // Cleanup
      try { fs.unlinkSync(tempPath); } catch {}

    } catch (err) {
      console.error("❌ [Video Command Error]:", err && (err.stack || err.message || err));
      if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
      return safeReply("❌ Something went wrong while fetching the video.");
    }
  }
};
