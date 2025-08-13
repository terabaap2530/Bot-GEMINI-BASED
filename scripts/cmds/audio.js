const axios = require("axios");
const fs = require("fs");
const path = require("path");

const YT_SEARCH_API = "https://dns-pxx0.onrender.com/search?query=";
const MINATO_DOWNLOAD_API_BASE = "https://youtube-minato-lamda.vercel.app/api/download?videoId=";

async function downloadFile(url, filepath) {
  const writer = fs.createWriteStream(filepath);
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

module.exports = {
  config: {
    name: "audio",
    version: "1.0",
    author: "Lord Denish",
    shortDescription: { en: "Search YouTube and download audio (MP3)" },
    longDescription: { en: "Downloads audio directly from Minato Lambda API." },
    category: "media",
    guide: "{pn} <search term or YouTube URL>",
  },

  onStart: async function ({ message, args }) {
    if (args.length === 0) return message.reply("❌ Please provide a YouTube URL or search term.");

    try {
      const query = args.join(" ");
      let videoId = "";
      let videoTitle = "";

      // Ensure cache folder exists
      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

      // Check if input is direct YouTube URL
      const ytIdMatch = query.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
      if (ytIdMatch) {
        videoId = ytIdMatch[1];
      } else {
        // Search YouTube via API
        const searchRes = await axios.get(YT_SEARCH_API + encodeURIComponent(query));
        const results = searchRes.data;

        if (!results || results.length === 0) return message.reply("❌ No videos found for your search.");

        videoId = results[0].videoId || results[0].videoIdShort || "";
        videoTitle = results[0].title || "YouTube Audio";
      }

      if (!videoId) return message.reply("❌ Could not find video ID from your input.");

      // Fetch download info from Minato API
      const downloadRes = await axios.get(MINATO_DOWNLOAD_API_BASE + encodeURIComponent(videoId));

      const streams = downloadRes.data.downloadResult?.response || {};
      // Prefer audio-only streams if available
      const audioStream = Object.values(streams).find(v => v?.download_url && v.download_url.includes(".mp3"));

      let directAudioUrl = audioStream?.download_url;

      // If no audio-only, fallback to video stream (will still be mp4)
      if (!directAudioUrl) {
        const videoStream = Object.values(streams).find(v => v?.download_url);
        if (!videoStream) return message.reply("❌ No downloadable stream found.");
        directAudioUrl = videoStream.download_url;
      }

      const tempAudioPath = path.join(cacheDir, `audio_${Date.now()}.mp3`);

      // Download audio
      await downloadFile(directAudioUrl, tempAudioPath);

      // Check file size
      const stats = fs.statSync(tempAudioPath);
      if (stats.size < 100000) {
        fs.unlinkSync(tempAudioPath);
        return message.reply("❌ Downloaded audio is too small, something went wrong.");
      }

      // Send MP3 file
      await message.reply({ body: `🎵 ${videoTitle}`, attachment: fs.createReadStream(tempAudioPath) });

      // Cleanup
      fs.unlinkSync(tempAudioPath);

    } catch (error) {
      console.error("❌ Error in audio command:", error.response?.data || error.message || error);
      return message.reply("❌ An error occurred while processing your request.");
    }
  },
};
