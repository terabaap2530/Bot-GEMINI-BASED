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
    version: "1.1",
    author: "Lord Denish",
    countDown: 20,
    role: 0,
    shortDescription: { en: "Download songs via dens-song-dl API" },
    description: "Type a song name to auto-download as MP3.",
    category: "🎶 Media",
    guide: { en: "{pn} <song name>" }
  },

  onStart: async function ({ api, message, args, event }) {
    if (api.setMessageReaction) api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const safeReply = async (text) => {
      try { await message.reply(text); } catch (e) { console.error("Failed to send reply:", e); }
    };

    if (!args.length) {
      if (api.setMessageReaction) api.setMessageReaction("⚠️", event.messageID, () => {}, true);
      return safeReply("⚠️ Provide a song name.");
    }

    const songName = args.join(" ");
    const startTime = Date.now();

    try {
      const { data } = await axios.get(
        `https://dens-song-dl.vercel.app/api/song?query=${encodeURIComponent(songName)}`
      );

      const songData = data?.result?.data;
      if (!songData?.downloadUrl) {
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return safeReply("❌ No results found or no download link available.");
      }

      const songTitle = songData.title || songName;
      const downloadUrl = songData.downloadUrl;

      const songInfoMessage = `
🎶 *Now Playing*: ${songTitle}  
⏳ *Duration*: ${songData.duration || "Unknown"}s  
📀 *Format*: ${songData.format || "mp3"}  
⚡ *Fetched in*: ${(Date.now() - startTime) / 1000}s  
`;

      const tempFileName = `song_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`;
      const tempPath = path.join(__dirname, tempFileName);

      const audioResponse = await axios({
        method: "get",
        url: downloadUrl,
        responseType: "stream",
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "*/*" },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 120000
      });

      await streamPipeline(audioResponse.data, fs.createWriteStream(tempPath));

      await message.reply({
        body: songInfoMessage,
        attachment: fs.createReadStream(tempPath)
      });

      if (api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);

      try { fs.unlinkSync(tempPath); } catch (e) {}
    } catch (err) {
      console.error("❌ [Song Command Error]:", err && (err.stack || err.message || err));
      if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
      return safeReply("❌ Something went wrong while fetching the song.");
    }
  }
};
