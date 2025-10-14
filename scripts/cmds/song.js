const axios = require("axios");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream");
const { promisify } = require("util");
const streamPipeline = promisify(pipeline);

module.exports = {
  config: {
    name: "song",
    aliases: ["sd"],
    version: "1.3",
    author: "Lord Denish",
    countDown: 20,
    role: 0,
    shortDescription: { en: "Download songs via dens-song-dl API" },
    description: "Type a song name to auto-download as MP3.",
    category: "🎶 Media",
    guide: { en: "{pn} <song name>" }
  },

  onStart: async function ({ api, message, args, event }) {
    if (api.setMessageReaction)
      api.setMessageReaction("🎧", event.messageID, () => {}, true);

    const safeReply = async (text, attachment = null) => {
      try {
        await message.reply(attachment ? { body: text, attachment } : text);
      } catch (e) {
        console.error("Reply failed:", e);
      }
    };

    if (!args.length) {
      if (api.setMessageReaction)
        api.setMessageReaction("⚠️", event.messageID, () => {}, true);
      return safeReply("⚠️ Please provide a song name.");
    }

    const songName = args.join(" ");
    const startTime = Date.now();

    try {
      // Step 1: Fetch song info
      const { data } = await axios.get(
        `https://dens-song-dl.vercel.app/api/song?query=${encodeURIComponent(songName)}`
      );

      if (!data?.status || !data?.result) {
        if (api.setMessageReaction)
          api.setMessageReaction("❌", event.messageID, () => {}, true);
        return safeReply("❌ No download link found or song unavailable.");
      }

      const { title, thumbnail, result: downloadUrl } = data;
      const tempFileName = `song_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`;
      const tempPath = path.join(__dirname, tempFileName);

      // Step 2: Download MP3
      const audioResponse = await axios({
        method: "get",
        url: downloadUrl,
        responseType: "stream",
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        headers: { "User-Agent": "Mozilla/5.0", Accept: "*/*" },
        timeout: 120000
      });

      await streamPipeline(audioResponse.data, fs.createWriteStream(tempPath));

      // Step 3: Send audio file
      await safeReply(
        `✅ *Downloaded Successfully!*  
🎶 *Title:* ${title}  
⚡ *Time Taken:* ${(Date.now() - startTime) / 1000}s  
👤 *By:* ${data.creator}`,
        fs.createReadStream(tempPath)
      );

      if (api.setMessageReaction)
        api.setMessageReaction("✅", event.messageID, () => {}, true);

      // Step 4: Delete temp file after send
      try {
        fs.unlinkSync(tempPath);
      } catch {}
    } catch (err) {
      console.error("❌ [Song Command Error]:", err?.stack || err?.message || err);
      if (api.setMessageReaction)
        api.setMessageReaction("❌", event.messageID, () => {}, true);
      return safeReply("❌ Something went wrong while downloading the song.");
    }
  }
};
