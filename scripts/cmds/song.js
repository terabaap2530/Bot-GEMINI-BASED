const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream");
const { promisify } = require("util");
const streamPipeline = promisify(pipeline);

module.exports = {
  config: {
    name: "song",
    aliases: ["sd"],
    version: "1.7",
    author: "Lord Denish",
    countDown: 20,
    role: 0,
    shortDescription: { en: "Download songs via dens-song-dl API" },
    description: "Type a song name to auto-download as MP3.",
    category: "🎶 Media",
    guide: { en: "{pn} <song name>" }
  },

  onStart: async function ({ api, message, args, event }) {
    const react = emoji => api.setMessageReaction?.(emoji, event.messageID, () => {}, true);
    const safeReply = async (text, attachment = null) => {
      try {
        await message.reply(attachment ? { body: text, attachment } : text);
      } catch (e) {
        console.error("Reply failed:", e.message);
      }
    };

    if (!args.length) {
      react("⚠️");
      return safeReply("⚠️ Please provide a song name.");
    }

    const songName = args.join(" ");
    const start = Date.now();

    try {
      // Step 1: Fetch song info from your API
      const { data } = await axios.get(
        `https://dens-song-dl.vercel.app/api/song?query=${encodeURIComponent(songName)}`
      );

      if (!data?.status || !data?.result) {
        react("❌");
        return safeReply("❌ No download link found or song unavailable.");
      }

      const { title, result: downloadUrl } = data;
      const tempFile = path.join(__dirname, `song_${Date.now()}.mp3`);

      // Step 2: Stream download with proper headers
      const response = await axios({
        method: "get",
        url: downloadUrl,
        responseType: "stream",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept": "audio/mpeg, audio/*;q=0.9,*/*;q=0.8",
          "Referer": "https://dens-song-dl.vercel.app/"
        },
        maxRedirects: 5,
        timeout: 180000 // 3 minutes max
      });

      await streamPipeline(response.data, fs.createWriteStream(tempFile));

      // Step 3: Send MP3 file
      await safeReply(
        `✅ *Downloaded Successfully!*  
🎶 *Title:* ${title}  
⚡ *Time Taken:* ${(Date.now() - start) / 1000}s  
👤 *By:* ${data.creator}`,
        fs.createReadStream(tempFile)
      );

      react("✅");

      // Step 4: Cleanup
      setTimeout(() => fs.unlink(tempFile, () => {}), 5000);
    } catch (err) {
      console.error("❌ [Song Command Error]:", err?.stack || err);
      react("❌");
      return safeReply("❌ Something went wrong while downloading the song.");
    }
  }
};
