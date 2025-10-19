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
    version: "6.3",
    author: "Lord Denish",
    countDown: 20,
    role: 0,
    shortDescription: { en: "Download full songs from YouTube as MP3" },
    description: "Reply to a message or type a song name to download as audio.",
    category: "🎶 Media",
    guide: { en: "{pn} <song name>\nReply to a message to auto-download audio." }
  },

  onStart: async function({ api, message, args, event }) {
    if (api.setMessageReaction) api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const safeReply = async (text) => {
      try { await message.reply(text); } catch (e) { console.error("Reply failed:", e); }
    };

    let songName;

    try {
      // Step 1: If replying to audio/video, attempt recognition
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

      // Step 2: Fallback to user query
      if (!songName) {
        if (!args.length) {
          if (api.setMessageReaction) api.setMessageReaction("⚠️", event.messageID, () => {}, true);
          return safeReply("⚠️ | Provide a song name or reply to audio/video.");
        }
        songName = args.join(" ");
      }

      const startTime = Date.now();

      // Step 3: Search using dns-ruby API
      let searchResults;
      try {
        const { data } = await axios.get(`https://dns-ruby.vercel.app/search?query=${encodeURIComponent(songName)}`);
        searchResults = data;
      } catch (err) {
        console.error("Search API failed:", err.message);
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return safeReply("❌ | Failed to search the song.");
      }

      if (!searchResults || searchResults.length === 0) {
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return safeReply("❌ | No results found.");
      }

      // Step 4: Pick the first matching full audio (ignore clips/covers if possible)
      const song = searchResults[0];
      const fixedUrl = song.url.split("&")[0]; // clean URL

      // Step 5: Call dens-audio API for MP3
      let downloadData;
      try {
        const { data } = await axios.get(`https://dens-audio.vercel.app/api/sing?url=${encodeURIComponent(fixedUrl)}`);
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
        return safeReply("❌ | Couldn’t extract audio link from API.");
      }

      // Step 6: Info message
      const infoMsg = `
🎵 *Title:* ${songTitle}
🔗 *Source:* YouTube
⚡ *Fetched in:* ${(Date.now() - startTime) / 1000}s
`;

      // Step 7: Download audio stream
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
        return safeReply("❌ | Failed to download the MP3 file.");
      }

      // Step 8: Send audio file
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
