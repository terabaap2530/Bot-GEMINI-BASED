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
    name: "video",
    version: "1.5",
    author: "Lord Denish",
    shortDescription: { en: "Search YouTube and download full video" },
    longDescription: { en: "Uses search API + Minato Lambda download API for full videos." },
    category: "media",
    guide: "{pn} <search term or YouTube URL>",
  },

  onStart: async function ({ message, args }) {
    if (args.length === 0) return message.reply("❌ Please provide a YouTube video URL or search term.");

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
        console.log("🔍 Search API response:", results);

        if (!results || results.length === 0) return message.reply("❌ No videos found for your search.");

        videoId = results[0].videoId || results[0].videoIdShort || "";
        videoTitle = results[0].title || "YouTube Video";
      }

      if (!videoId) return message.reply("❌ Could not find video ID from your input.");

      // Fetch download info from Minato API
      const downloadRes = await axios.get(MINATO_DOWNLOAD_API_BASE + encodeURIComponent(videoId));
      console.log("📥 Minato API response:", downloadRes.data);

      const streams = downloadRes.data.downloadResult?.response || {};
      const availableStreams = Object.values(streams).filter(v => v?.download_url);

      if (availableStreams.length === 0) return message.reply("❌ No downloadable video URL found.");

      const videoData = availableStreams[0];
      const directVideoUrl = videoData.download_url;
      const finalTitle = videoTitle || videoData.title || "YouTube Video";

      const ext = directVideoUrl.includes(".mp3") ? ".mp3" : ".mp4";
      const tempFilePath = path.join(cacheDir, `video_${Date.now()}${ext}`);

      // Download video file
      await downloadFile(directVideoUrl, tempFilePath);

      // Check file size
      const stats = fs.statSync(tempFilePath);
      if (stats.size < 100000) {
        fs.unlinkSync(tempFilePath);
        return message.reply("❌ Downloaded file is too small, something went wrong.");
      }

      // Send **only one message** with video and title
      await message.reply({ body: `🎬 ${finalTitle}`, attachment: fs.createReadStream(tempFilePath) });

      // Cleanup
      fs.unlinkSync(tempFilePath);

    } catch (error) {
      console.error("❌ Error in video command:", error.response?.data || error.message || error);
      return message.reply("❌ An error occurred while processing your request.");
    }
  },
};
