const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { parse } = require("url");

// Map hostnames to Universal Downloader API endpoints
const PLATFORM_API_MAP = {
    "instagram": "/api/meta/download",
    "facebook": "/api/meta/download", // Facebook now uses meta
    "tiktok": "/api/tiktok/download",
    "youtube": "/api/youtube/download",
    "reddit": "/api/reddit/download",
    "pinterest": "/api/pinterest/download",
    "threads": "/api/threads/download",
    "linkedin": "/api/linkedin/download",
    "twitter": "/api/twitter/download",
    "x.com": "/api/twitter/download"
};

module.exports = {
    config: {
        name: "autolink",
        version: "8.0",
        author: "Lord Denish",
        countDown: 5,
        role: 0,
        shortDescription: "Auto-download videos from multiple platforms",
        longDescription: "Detects video links and downloads automatically using Universal Downloader API.",
        category: "media",
        guide: "Send any supported video link in chat."
    },

    onStart: async function () {},

    onChat: async function ({ event, api }) {
        try {
            const text = event.body || "";
            const urlMatch = text.match(/https?:\/\/[^\s]+/i);
            if (!urlMatch) return;

            const url = urlMatch[0].replace(/\?$/, "");
            const hostname = parse(url).hostname.toLowerCase();

            // Determine which API endpoint to use
            let apiEndpoint = null;
            for (const key in PLATFORM_API_MAP) {
                if (hostname.includes(key)) {
                    apiEndpoint = PLATFORM_API_MAP[key];
                    break;
                }
            }
            if (!apiEndpoint) return; // Unsupported platform

            // React ⏳ for download started
            api.setMessageReaction("⏳", event.messageID, () => {}, true);

            const apiUrl = `https://universaldownloaderapi.vercel.app${apiEndpoint}?url=${encodeURIComponent(url)}`;
            const res = await axios.get(apiUrl, { timeout: 30000 });
            const data = res.data;

            // Determine the correct video URL depending on platform
            let videoUrl = null;

            // Instagram / Facebook (meta endpoint)
            if (data?.data?.data?.length > 0 && data.data.data[0].url) {
                videoUrl = data.data.data[0].url;
            }
            // TikTok / YouTube
            else if (data?.download_url) {
                videoUrl = data.download_url;
            }
            // Reddit / Twitter / Others
            else if (data?.data?.[0]?.video_url) {
                videoUrl = data.data[0].video_url;
            }

            if (!videoUrl || !videoUrl.startsWith("http")) {
                api.setMessageReaction("💔", event.messageID, () => {}, true);
                return;
            }

            // Prepare cache folder
            const cacheDir = path.join(__dirname, "cache");
            if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

            const filePath = path.join(cacheDir, `video_${Date.now()}.mp4`);

            // Download video
            const response = await axios({
                method: "GET",
                url: videoUrl,
                responseType: "stream",
                timeout: 60000
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on("finish", resolve);
                writer.on("error", reject);
            });

            // Size check (100MB)
            const fileSizeMB = fs.statSync(filePath).size / (1024 * 1024);
            if (fileSizeMB > 100) {
                fs.unlinkSync(filePath);
                api.setMessageReaction("💔", event.messageID, () => {}, true);
                return;
            }

            // Send video and react ✅
            await api.sendMessage(
                { attachment: fs.createReadStream(filePath) },
                event.threadID,
                (err) => {
                    fs.unlinkSync(filePath);
                    if (err) api.setMessageReaction("💔", event.messageID, () => {}, true);
                    else api.setMessageReaction("✅", event.messageID, () => {}, true);
                },
                event.messageID
            );

        } catch (err) {
            console.error("AutoLink Error:", err.message || err);
            api.setMessageReaction("💔", event.messageID, () => {}, true);
        }
    }
};
