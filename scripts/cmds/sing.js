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
    version: "6.0",
    author: "Lord Denish",
    countDown: 20,
    role: 0,
    shortDescription: { en: "Auto-download songs from YouTube or recognized audio/video" },
    description: "Reply to an audio/video or type a search term to download the song as MP3 automatically.",
    category: "🎶 Media",
    guide: { en: "{pn} <song name>\nReply to an audio/video to auto-download." }
  },

  onStart: async function ({ api, message, args, event }) {
    if (api.setMessageReaction) api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const safeReply = async (text) => {
      try { await message.reply(text); } catch (e) { console.error("Reply failed:", e); }
    };

    let songName;

    try {
      // Recognize song if replying to audio/video
      if (event.messageReply && event.messageReply.attachments?.length > 0) {
        const attachment = event.messageReply.attachments[0];
        if (attachment.type === "audio" || attachment.type === "video") {
          try {
            const recogUrl = `https://audio-recon-ahcw.onrender.com/kshitiz?url=${encodeURIComponent(attachment.url)}`;
            const { data: recogData } = await axios.get(recogUrl);
            if (recogData?.title) songName = recogData.title;
          } catch (err) {
            console.error("Audio-Recon API failed:", err.message);
          }
        }
      }

      // Fallback: use search term
      if (!songName) {
        if (!args.length) {
          if (api.setMessageReaction) api.setMessageReaction("⚠️", event.messageID, () => {}, true);
          return safeReply("⚠️ | Provide a song name or reply to an audio/video.");
        }
        songName = args.join(" ");
      }

      const startTime = Date.now();

      // 🔍 Search for the song
      let searchResults;
      try {
        const { data } = await axios.get(`https://dns-ruby.vercel.app/search?query=${encodeURIComponent(songName)}`);
        searchResults = data;
      } catch (err) {
        console.error("Search API failed:", err.message);
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return safeReply("❌ | Failed to search the song.");
      }

      if (!searchResults || !searchResults[0]?.url) {
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return safeReply("❌ | No results found for this query.");
      }

      const song = searchResults[0];
      const videoUrl = song.url;

      // 🎧 Download using your new API
      let downloadData;
      try {
        const { data } = await axios.get(`https://dens-audio.vercel.app/api/sing?url=${encodeURIComponent(videoUrl)}`);
        downloadData = data;
      } catch (err) {
        console.error("Download API failed:", err.message);
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return safeReply("❌ | Download API failed.");
      }

      const downloadUrl = downloadData?.result?.downloadUrl;
      const songTitle = downloadData?.title || song.title || "Unknown";

      if (!downloadUrl) {
        console.error("Invalid response from API:", JSON.stringify(downloadData).slice(0, 500));
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return safeReply("❌ | Download API did not return a valid MP3 link.");
      }

      const infoMsg = `
🎵 *Title:* ${songTitle}
🔗 *Source:* YouTube
⚡ *Fetched in:* ${(Date.now() - startTime) / 1000}s
`;

      // Download audio stream to temp file
      const tempFile = path.join(__dirname, `temp_${Date.now()}.mp3`);
      try {
        const response = await axios({
          url: downloadUrl,
          method: "GET",
          responseType: "stream",
          httpsAgent: new https.Agent({ rejectUnauthorized: false }),
          headers: { "User-Agent": "Mozilla/5.0" },
          timeout: 120000
        });
        await streamPipeline(response.data, fs.createWriteStream(tempFile));
      } catch (err) {
        console.error("Stream download failed:", err.message);
        return safeReply("❌ | Failed to download the MP3 file.");
      }

      // Send song file
      await message.reply({
        body: infoMsg,
        attachment: fs.createReadStream(tempFile)
      });

      // Cleanup
      fs.unlinkSync(tempFile);
      if (api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);

    } catch (err) {
      console.error("General error in sing command:", err.message);
      if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
      await safeReply("❌ | An unexpected error occurred.");
    }
  }
};
