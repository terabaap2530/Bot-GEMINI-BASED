const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const YT_SEARCH_API = "https://dns-pxx0.onrender.com/search?query=";
const MINATO_DOWNLOAD_API_BASE = "https://youtube-minato-lamda.vercel.app/api/download?videoId=";

async function downloadFile(url, filepath) {
  const writer = fs.createWriteStream(filepath);
  const response = await axios({ url, method: "GET", responseType: "stream" });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

function convertToMp3(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    exec(`ffmpeg -y -i "${inputPath}" -vn -ar 44100 -ac 2 -b:a 192k "${outputPath}"`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = {
  config: {
    name: "audio",
    version: "1.5",
    author: "Lord Denish",
    shortDescription: { en: "Download full audio from YouTube" },
    longDescription: { en: "Fetch full song from YouTube using search query, URL, or reply to video/audio" },
    category: "media",
    guide: "{pn} <search term> OR reply to a video/audio/YouTube link",
  },

  onStart: async function ({ message, args, event }) {
    try {
      let query = args.join(" ");
      let videoId = "";
      let videoTitle = "YouTube Audio";

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

      // ----- REPLY HANDLING -----
      if (event.type === "message_reply" && event.messageReply) {
        const replied = event.messageReply;

        // If replied has YouTube link → use it
        const ytMatch = replied.body?.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
        if (ytMatch) {
          videoId = ytMatch[1];
        } 
        // If replied is a media file (video/audio) → use filename or caption as search query
        else if (replied.attachments?.length > 0) {
          query = replied.body?.trim() || replied.attachments[0].filename || "";
        }
      }

      // ----- DIRECT URL HANDLING -----
      if (!videoId && query) {
        const ytMatch = query.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
        if (ytMatch) videoId = ytMatch[1];
      }

      // ----- SEARCH HANDLING -----
      if (!videoId && query) {
        const searchRes = await axios.get(YT_SEARCH_API + encodeURIComponent(query));
        const results = searchRes.data;
        if (!results || results.length === 0)
          return message.reply("❌ No videos found for your search.");
        videoId = results[0].videoId;
        videoTitle = results[0].title || "YouTube Audio";
      }

      if (!videoId) return message.reply("❌ No valid YouTube video found.");

      // ----- DOWNLOAD STREAMS -----
      const downloadRes = await axios.get(MINATO_DOWNLOAD_API_BASE + encodeURIComponent(videoId));
      const streams = downloadRes.data.downloadResult?.response || {};

      // Pick highest-quality audio first, fallback to video
      const bestStream = Object.values(streams)
        .filter(v => v?.download_url)
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

      if (!bestStream) return message.reply("❌ Could not find any stream to download.");

      const tempVideoPath = path.join(cacheDir, `video_${Date.now()}.mp4`);
      const tempAudioPath = path.join(cacheDir, `audio_${Date.now()}.mp3`);

      // Download the stream
      await downloadFile(bestStream.download_url, tempVideoPath);

      // Convert to MP3
      await convertToMp3(tempVideoPath, tempAudioPath);

      // Send full audio
      await message.reply({ body: `🎵 ${videoTitle}`, attachment: fs.createReadStream(tempAudioPath) });

      // Cleanup
      fs.unlinkSync(tempVideoPath);
      fs.unlinkSync(tempAudioPath);

    } catch (error) {
      console.error("❌ Error in audio command:", error.response?.data || error.message || error);
      return message.reply("❌ An error occurred while processing your request.");
    }
  },
};
