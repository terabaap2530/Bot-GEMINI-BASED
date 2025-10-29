const axios = require("axios");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream");
const { promisify } = require("util");
const ffmpeg = require("fluent-ffmpeg");
const streamPipeline = promisify(pipeline);

module.exports = {
  config: {
    name: "audio",
    aliases: ["a"],
    version: "2.0",
    author: "Lord Denish",
    countDown: 20,
    role: 0,
    shortDescription: { en: "Download YouTube audio as MP3" },
    description: "Search or provide a YouTube link and auto-download audio as MP3.",
    category: "🎵 Media",
    guide: { en: "{pn} <video name or YouTube URL>" }
  },

  onStart: async function ({ api, message, args, event }) {
    if (api.setMessageReaction) api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const safeReply = async (text) => {
      try { await message.reply(text); } catch (e) { console.error(e); }
    };

    try {
      if (!args.length) {
        if (api.setMessageReaction) api.setMessageReaction("⚠️", event.messageID, () => {}, true);
        return safeReply("⚠️ Provide a YouTube link or search term.");
      }

      const query = args.join(" ");

      // Fetch video URL
      const { data } = await axios.get(
        `https://dens-videojs.vercel.app/api/video?query=${encodeURIComponent(query)}`
      );

      if (!data?.status || !data?.result?.mp4) {
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return safeReply("❌ No video found.");
      }

      const videoUrl = data.result.mp4;
      const title = data.result.title;

      // Download temporary video
      const tempVideo = path.join(__dirname, `video_${Date.now()}.mp4`);
      const tempAudio = path.join(__dirname, `audio_${Date.now()}.mp3`);

      const videoResponse = await axios({
        method: "get",
        url: videoUrl,
        responseType: "stream",
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.youtube.com/", "Accept": "*/*" },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 180000
      });

      await streamPipeline(videoResponse.data, fs.createWriteStream(tempVideo));

      // Convert to audio using ffmpeg
      await new Promise((resolve, reject) => {
        ffmpeg(tempVideo)
          .noVideo()
          .audioCodec("libmp3lame")
          .format("mp3")
          .save(tempAudio)
          .on("end", resolve)
          .on("error", reject);
      });

      // Send audio
      await message.reply({ body: `🎵 ${title}`, attachment: fs.createReadStream(tempAudio) });
      if (api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);

      // Cleanup
      try { fs.unlinkSync(tempVideo); fs.unlinkSync(tempAudio); } catch {}

    } catch (err) {
      console.error("❌ [Audio Command Error]:", err && (err.stack || err.message || err));
      if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
      return safeReply("❌ Something went wrong while fetching the audio.");
    }
  }
};
