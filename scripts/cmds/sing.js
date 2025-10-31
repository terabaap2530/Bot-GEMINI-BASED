const axios = require("axios");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream");
const { promisify } = require("util");
const streamPipeline = promisify(pipeline);

module.exports = {
  config: {
    name: "sing",
    aliases: ["s"],
    version: "7.0",
    author: "Lord Denish",
    countDown: 20,
    role: 0,
    shortDescription: { en: "Download full songs from YouTube as MP3" },
    description: "Type or reply with a song name to download audio.",
    category: "🎶 Media",
    guide: { en: "{pn} <song name>\nOr reply to a message to auto-detect audio." }
  },

  onStart: async function ({ api, message, args, event }) {
    if (api.setMessageReaction) api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const safeReply = async (text) => {
      try { await message.reply(text); } catch (e) { console.error("Reply failed:", e); }
    };

    try {
      // --- Step 1: Get song name ---
      if (!args.length) {
        if (api.setMessageReaction) api.setMessageReaction("⚠️", event.messageID, () => {}, true);
        return safeReply("⚠️ | Please provide a song name.");
      }
      const songName = args.join(" ");
      const startTime = Date.now();

      // --- Step 2: Search YouTube using dns-ruby API ---
      let searchResults;
      try {
        const { data } = await axios.get(`https://dns-ruby.vercel.app/search?query=${encodeURIComponent(songName)}`);
        searchResults = data;
      } catch (err) {
        console.error("Search API failed:", err.message);
        return safeReply("❌ | Failed to search for the song.");
      }

      if (!searchResults || searchResults.length === 0) {
        return safeReply("❌ | No results found.");
      }

      // --- Step 3: Pick first result ---
      const song = searchResults[0];
      const youtubeUrl = song.url.split("&")[0];

      // --- Step 4: Get MP3 from your API ---
      let audioData;
      try {
        const { data } = await axios.get(`https://dens-audio.vercel.app/api/ytmp3?url=${encodeURIComponent(youtubeUrl)}`);
        audioData = data;
      } catch (err) {
        console.error("Audio API failed:", err.message);
        return safeReply("❌ | Audio download API failed.");
      }

      const downloadUrl = audioData.download_url;
      const title = audioData.title || song.title;

      if (!downloadUrl) {
        console.error("Invalid audio data:", audioData);
        return safeReply("❌ | Could not retrieve MP3 link.");
      }

      // --- Step 5: Download the MP3 ---
      const tempFile = path.join(__dirname, `temp_${Date.now()}.mp3`);
      try {
        const response = await axios({
          url: downloadUrl,
          method: "GET",
          responseType: "stream",
          httpsAgent: new https.Agent({ rejectUnauthorized: false }),
          headers: { "User-Agent": "Mozilla/5.0" },
          timeout: 300000
        });
        await streamPipeline(response.data, fs.createWriteStream(tempFile));
      } catch (err) {
        console.error("Stream download failed:", err.message);
        return safeReply("❌ | Failed to download the MP3.");
      }

      // --- Step 6: Send audio to chat ---
      await message.reply({
        body: `🎵 *Title:* ${title}\n🔗 *Source:* YouTube\n⚡ *Fetched in:* ${(Date.now() - startTime) / 1000}s`,
        attachment: fs.createReadStream(tempFile)
      });

      fs.unlinkSync(tempFile);
      if (api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);

    } catch (err) {
      console.error("General error in sing command:", err.message);
      if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
      safeReply("❌ | Something went wrong while processing your request.");
    }
  }
};
