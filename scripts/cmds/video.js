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
    version: "1.1",
    author: "Denish dada",
    shortDescription: { en: "Search YouTube and download full video" },
    longDescription: { en: "Uses search API + Minato Lambda download API for full videos." },
    category: "media",
    guide: "{pn} <search term or YouTube URL>",
  },

  onStart: async function({ message, args }) {
    if (args.length === 0) {
      return message.reply("Please provide a YouTube video URL or search term.");
    }

    try {
      const query = args.join(" ");

      let videoId = "";
      let videoTitle = "";
      let videoUrl = "";

      // If input is URL, try to extract videoId from it
      const ytIdMatch = query.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
      if (ytIdMatch) {
        videoId = ytIdMatch[1];
      } else {
        // Otherwise search via your search API
        const searchRes = await axios.get(YT_SEARCH_API + encodeURIComponent(query));
        const results = searchRes.data;
        if (!results || results.length === 0) {
          return message.reply("No videos found for your search.");
        }
        videoId = results[0].videoId || results[0].videoIdShort || "";
        videoTitle = results[0].title || "YouTube Video";
        videoUrl = results[0].url || results[0].videoUrl || results[0].link || "";
      }

      if (!videoId) {
        return message.reply("Could not find video ID from your input.");
      }

      // Fetch download info from Minato Lambda API
      const downloadRes = await axios.get(MINATO_DOWNLOAD_API_BASE + encodeURIComponent(videoId));
      if (!downloadRes.data || !downloadRes.data.downloadResult) {
        return message.reply("Failed to get download data from Minato API.");
      }

      // Get best available quality, fallback order: 720p > 480p > 360p etc
      const qualityOrder = ["720p", "480p", "360p", "240p"];
      let videoData = null;

      for (const q of qualityOrder) {
        if (downloadRes.data.downloadResult.response[q]) {
          videoData = downloadRes.data.downloadResult.response[q];
          break;
        }
      }

      if (!videoData || !videoData.download_url) {
        return message.reply("No downloadable video URL found in Minato API response.");
      }

      const directVideoUrl = videoData.download_url;
      const finalTitle = videoTitle || videoData.title || "YouTube Video";
      const ext = directVideoUrl.includes(".mp3") ? ".mp3" : ".mp4";
      const tempFilePath = path.join(__dirname, "cache", `video_${Date.now()}${ext}`);

      // Download video file fully
      await downloadFile(directVideoUrl, tempFilePath);

      // Check file size to avoid 0 byte or too small file
      const stats = fs.statSync(tempFilePath);
      if (stats.size < 100000) {
        fs.unlinkSync(tempFilePath);
        return message.reply("Downloaded video file is too small, something went wrong.");
      }

      // Send the video as attachment with title
      await message.reply({ body: `🎬 ${finalTitle}`, attachment: fs.createReadStream(tempFilePath) });

      // Delete temp file after sending
      fs.unlinkSync(tempFilePath);

    } catch (error) {
      console.error("Error in video command:", error.response?.data || error.message || error);
      return message.reply("An error occurred while processing your request.");
    }
  },
};
