const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const CACHE_FOLDER = path.join(__dirname, "cache");
const DOWNLOAD_API_KEY = "74960cb2-da41-4b5c-b8b2-086d0c77751e";
const METADATA_API_KEY = "173c7c50-02d9-4b22-a83a-519ea6f93429";

async function downloadAudio(downloadUrl, filePath) {
 const writer = fs.createWriteStream(filePath);

 const response = await axios({
 url: downloadUrl,
 method: "GET",
 responseType: "stream",
 });

 return new Promise((resolve, reject) => {
 response.data.pipe(writer);
 writer.on("finish", resolve);
 writer.on("error", reject);
 });
}

async function fetchAudioFromReply(event) {
 const attachment = event.messageReply?.attachments?.[0];
 if (!attachment || (attachment.type !== "video" && attachment.type !== "audio")) {
 throw new Error("⚠️ | Please reply to a valid video or audio.");
 }

 const shortUrl = attachment.url;
 const response = await axios.get(`https://audio-recon-ahcw.onrender.com/kshitiz?url=${encodeURIComponent(shortUrl)}`);
 return response.data.title;
}

async function fetchAudioFromQuery(query) {
 const response = await axios.get(`https://kaiz-apis.gleeze.com/api/yt-metadata?title=${encodeURIComponent(query)}&apikey=${METADATA_API_KEY}`);
 const videoData = response.data;
 if (videoData && videoData.url && videoData.videoId) {
 return {
 videoId: videoData.videoId,
 title: videoData.title,
 duration: videoData.duration || "Unknown",
 url: videoData.url
 };
 } else {
 throw new Error("❌ | No results found.");
 }
}

async function handleAudioCommand(api, event, args) {
 const { threadID, messageID, messageReply } = event;
 await fs.ensureDir(CACHE_FOLDER);
 api.setMessageReaction("✅", messageID, () => {}, true);

 try {
 let videoData;

 if (messageReply?.attachments?.length > 0) {
 const title = await fetchAudioFromReply(event);
 videoData = await fetchAudioFromQuery(title);
 } else if (args.length > 0) {
 const query = args.join(" ");
 videoData = await fetchAudioFromQuery(query);
 } else {
 return api.sendMessage("⚠️ | Provide a search term or reply to a video/audio.", threadID, messageID);
 }

 const { videoId, title, duration, url } = videoData;
 const filePath = path.join(CACHE_FOLDER, `${videoId}.mp3`);

 const downloadResponse = await axios.get(`https://kaiz-apis.gleeze.com/api/ytdown-mp3?url=${encodeURIComponent(url)}&apikey=${DOWNLOAD_API_KEY}`);
 const downloadData = downloadResponse.data;

 if (!downloadData.download_url) {
 throw new Error("❌ | Couldn't retrieve audio download link.");
 }

 await downloadAudio(downloadData.download_url, filePath);

 if (!fs.existsSync(filePath)) throw new Error("❌ | Downloaded file not found.");
 const stats = fs.statSync(filePath);
 if (stats.size === 0) {
 fs.unlinkSync(filePath);
 throw new Error("❌ | File is empty.");
 }
 if (stats.size > 25 * 1024 * 1024) {
 fs.unlinkSync(filePath);
 return api.sendMessage("⚠️ | Audio is too large to send (>25MB).", threadID, messageID);
 }

 api.sendMessage({
 body: `🎵 Title: ${title}\n🕒 Duration: ${duration}`,
 attachment: fs.createReadStream(filePath)
 }, threadID, () => fs.unlinkSync(filePath), messageID);

 } catch (error) {
 api.sendMessage(error.message || "❌ | Something went wrong.", event.threadID, event.messageID);
 }
}

module.exports = {
 config: {
 name: "sing",
 version: "1.0",
 author: "Lord Itachi",
 countDown: 10,
 role: 0,
 shortDescription: "Download audio from YouTube using title or reply to video/audio",
 longDescription: "Use this command to convert a video/audio into MP3 and send back.",
 category: "media",
 guide: "{pn} <title>\nReply to audio/video for best result"
 },

 onStart: async function({ api, event, args }) {
 return handleAudioCommand(api, event, args);
 }
};
