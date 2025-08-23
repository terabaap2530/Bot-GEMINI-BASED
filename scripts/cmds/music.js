const axios = require("axios");
const fs = require("fs");
const path = require("path");
const ytSearch = require("yt-search");

module.exports = {
  config: {
    name: "music",
    version: "1.3.0",
    author: "Ajeet",
    description: "Download YouTube song silently with reactions",
    category: "media",
    guide: { en: "{pn} [songName] [audio/video]" }
  },

  onStart: async function ({ api, event, args }) {
    let songName, type;

    // Get song name & type
    if (
      args.length > 1 &&
      (args[args.length - 1] === "audio" || args[args.length - 1] === "video")
    ) {
      type = args.pop();
      songName = args.join(" ");
    } else {
      songName = args.join(" ");
      type = "audio";
    }

    if (!songName) {
      return api.setMessageReaction("❌", event.messageID, () => {}, true);
    }

    // Initial Reaction
    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    try {
      // Search YouTube
      const searchResults = await ytSearch(songName);
      if (!searchResults || !searchResults.videos.length) {
        return api.setMessageReaction("❌", event.messageID, () => {}, true);
      }

      const topResult = searchResults.videos[0];
      if (topResult.seconds > 600) {
        return api.setMessageReaction("❌", event.messageID, () => {}, true);
      }

      const videoId = topResult.videoId;
      const apiKey = "priyansh-here";
      const apiUrl = `https://priyanshuapi.xyz/youtube?id=${videoId}&type=${type}&apikey=${apiKey}`;

      api.setMessageReaction("⌛", event.messageID, () => {}, true);

      // Get download link
      const downloadResponse = await axios.get(apiUrl);
      if (!downloadResponse.data || !downloadResponse.data.downloadUrl) {
        return api.setMessageReaction("❌", event.messageID, () => {}, true);
      }

      const downloadUrl = downloadResponse.data.downloadUrl;
      const safeTitle = topResult.title.replace(/[^a-zA-Z0-9 \-_]/g, "");
      const filename = `${Date.now()}_${safeTitle}.${type === "audio" ? "mp3" : "mp4"}`;
      const downloadPath = path.join(__dirname, "cache", filename);

      if (!fs.existsSync(path.dirname(downloadPath))) {
        fs.mkdirSync(path.dirname(downloadPath), { recursive: true });
      }

      // Download File
      const response = await axios({ url: downloadUrl, method: "GET", responseType: "stream" });
      const fileStream = fs.createWriteStream(downloadPath);
      response.data.pipe(fileStream);

      await new Promise((resolve, reject) => {
        fileStream.on("finish", resolve);
        fileStream.on("error", reject);
      });

      // Success Reaction
      api.setMessageReaction("✅", event.messageID, () => {}, true);

      // Send File silently
      await api.sendMessage(
        { attachment: fs.createReadStream(downloadPath) },
        event.threadID,
        () => fs.unlinkSync(downloadPath),
        event.messageID
      );

    } catch (error) {
      console.error(`Music command error: ${error.message}`);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
    }
  }
};
