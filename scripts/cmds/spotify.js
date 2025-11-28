const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream");
const { promisify } = require("util");
const streamPipeline = promisify(pipeline);

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  config: {
    name: "spotify",
    aliases: ["sp"],
    author: "Denish",
    version: "1.2",
    cooldowns: 5,
    role: 0,
    shortDescription: "Download Spotify song as MP3",
    longDescription: "Searches Spotify and sends the MP3 audio via Spotdown",
    category: "🎶 Media",
    guide: "{p}sing <song name>"
  },

  onStart: async function ({ api, event, args }) {
    if (!args.length) return api.sendMessage("⚠️ Please provide a song name.", event.threadID, event.messageID);

    const songName = args.join(" ");
    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    try {
      // Step 1: Search Spotify
      const searchRes = await axios.get(`https://spotify-search-api-dens.onrender.com/api/song?query=${encodeURIComponent(songName)}`);
      const songs = searchRes.data?.result?.songs;
      if (!songs || songs.length === 0) return api.sendMessage("❌ No songs found.", event.threadID, event.messageID);

      const song = songs[0]; // pick first result
      const trackUrl = song.url;

      // Step 2: Generate Spotdown MP3 link
      const downloadRes = await axios.get(`https://spotdown-api.onrender.com/api/generate-link?trackUrl=${encodeURIComponent(trackUrl)}`);
      const downloadUrl = downloadRes.data?.data?.downloadLinks?.[0]?.url;
      if (!downloadUrl) return api.sendMessage("❌ Could not generate MP3 link.", event.threadID, event.messageID);

      // Step 2b: Wait for stream to be ready
      await wait(10000); // wait 10 seconds

      // Step 3: Make sure cache folder exists
      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

      const tempFile = path.join(cacheDir, `song_${Date.now()}.mp3`);

      // Step 4: Stream MP3 and save locally
      const response = await axios({
        url: downloadUrl,
        method: "GET",
        responseType: "stream",
        timeout: 300000,
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      await streamPipeline(response.data, fs.createWriteStream(tempFile));

      // Step 5: Send MP3 to chat
      await api.sendMessage(
        { 
          body: `🎵 *Title:* ${song.title}\n👤 *Artist:* ${song.artist}`, 
          attachment: fs.createReadStream(tempFile) 
        },
        event.threadID,
        () => {
          fs.unlinkSync(tempFile); // delete after sending
          api.setMessageReaction("✅", event.messageID, () => {}, true);
        },
        event.messageID
      );

    } catch (err) {
      console.error("Spotify cmd error:", err);
      api.sendMessage("❌ Failed to fetch or send the song.", event.threadID, event.messageID);
      api.setMessageReaction("⚠️", event.messageID, () => {}, true);
    }
  }
};
