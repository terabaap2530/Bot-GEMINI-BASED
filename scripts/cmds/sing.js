const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { exec } = require("child_process");

const CACHE_FOLDER = path.join(__dirname, "cache");
const YT_SEARCH_API = "https://dns-pxx0.onrender.com/search?query=";
const MINATO_DOWNLOAD_API_BASE = "https://youtube-minato-lamda.vercel.app/api/download?videoId=";

// Ensure cache folder exists
fs.ensureDirSync(CACHE_FOLDER);

// Download a file
async function downloadFile(url, filePath) {
  const writer = fs.createWriteStream(filePath);
  const response = await axios({ url, method: "GET", responseType: "stream" });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

// Convert video to MP3
function convertToMp3(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    exec(`ffmpeg -y -i "${inputPath}" -vn -ar 44100 -ac 2 -b:a 192k "${outputPath}"`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Fetch song title from replied audio/video
async function fetchTitleFromReply(event) {
  const attachment = event.messageReply?.attachments?.[0];
  if (!attachment || (attachment.type !== "audio" && attachment.type !== "video")) {
    throw new Error("⚠️ | Please reply to a valid audio or video.");
  }

  const response = await axios.get(
    `https://audio-recon-ahcw.onrender.com/kshitiz?url=${encodeURIComponent(attachment.url)}`
  );
  if (!response.data?.title) throw new Error("❌ | Could not identify the song from this file.");
  return response.data.title;
}

// Fetch video data from YouTube search
async function fetchVideoFromQuery(query) {
  const searchRes = await axios.get(YT_SEARCH_API + encodeURIComponent(query));
  const results = searchRes.data;
  if (!results || results.length === 0) throw new Error("❌ No videos found for this query.");
  const video = results[0];
  return { videoId: video.videoId, title: video.title || "YouTube Audio" };
}

// Download audio stream from Minato API
async function downloadAudioFromYouTube(videoId, title) {
  const downloadRes = await axios.get(MINATO_DOWNLOAD_API_BASE + encodeURIComponent(videoId));
  const streams = downloadRes.data.downloadResult?.response || {};
  const bestStream = Object.values(streams)
    .filter(v => v?.download_url)
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
  if (!bestStream) throw new Error("❌ Could not find a downloadable stream.");

  const tempVideoPath = path.join(CACHE_FOLDER, `video_${Date.now()}.mp4`);
  const tempAudioPath = path.join(CACHE_FOLDER, `audio_${Date.now()}.mp3`);

  await downloadFile(bestStream.download_url, tempVideoPath);
  await convertToMp3(tempVideoPath, tempAudioPath);

  return { tempVideoPath, tempAudioPath, title };
}

// Main command handler
async function handleSingCommand({ api, event, args }) {
  try {
    let query = args.join(" ");

    // If replying to audio/video → get title
    if (event.type === "message_reply" && event.messageReply?.attachments?.length > 0) {
      query = await fetchTitleFromReply(event);
    }

    if (!query) {
      return api.sendMessage("⚠️ | Provide a search term or reply to audio/video.", event.threadID, event.messageID);
    }

    // Get YouTube video info
    const { videoId, title } = await fetchVideoFromQuery(query);

    // Download audio
    const { tempVideoPath, tempAudioPath, title: audioTitle } = await downloadAudioFromYouTube(videoId, title);

    // Send audio
    api.sendMessage(
      { body: `🎵 ${audioTitle}`, attachment: fs.createReadStream(tempAudioPath) },
      event.threadID,
      () => {
        fs.unlinkSync(tempVideoPath);
        fs.unlinkSync(tempAudioPath);
      },
      event.messageID
    );

  } catch (err) {
    console.error(err);
    api.sendMessage(err.message || "❌ Something went wrong.", event.threadID, event.messageID);
  }
}

module.exports = {
  config: {
    name: "sing",
    version: "2.0",
    author: "Lord Denish",
    shortDescription: "Get exact song from audio/video or search term",
    longDescription: "Reply to a voice/video or type a search term to download the song as MP3",
    category: "media",
    guide: "{pn} <search term> OR reply to audio/video",
  },
  onStart: handleSingCommand
};
