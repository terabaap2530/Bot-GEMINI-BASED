const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { parse } = require("url");

// Map hostnames to API endpoints
const PLATFORM_API_MAP = {
    "instagram": "/api/meta/download",
    "facebook": "/api/meta/download",
    "youtube": "https://yt-dl-mp4.vercel.app/api/ytmp4?url=", // Your YouTube API
    "reddit": "/api/reddit/download",
    "pinterest": "/api/pinterest/download",
    "threads": "/api/threads/download",
    "linkedin": "/api/linkedin/download",
    "twitter": "/api/twitter/download",
    "x.com": "/api/twitter/download",
    "tiktok": "https://tiktok-dl-kappa-jade.vercel.app/api/tiktok?url=" // Your TikTok API
};

// Expand short TikTok links
async function expandTikTokUrl(shortUrl) {
    try {
        const res = await axios.get(shortUrl, {
            maxRedirects: 0,
            validateStatus: status => status >= 200 && status < 400
        });
        if (res.status === 301 || res.status === 302) return res.headers.location;
        return shortUrl;
    } catch (err) {
        if (err.response && (err.response.status === 301 || err.response.status === 302)) {
            return err.response.headers.location;
        }
        return shortUrl;
    }
}

module.exports = {
    config: {
        name: "autolink",
        version: "8.4",
        author: "Lord Denish",
        countDown: 5,
        role: 0,
        shortDescription: "Auto-download videos from multiple platforms",
        longDescription: "Detects video links and downloads automatically using multiple APIs.",
        category: "media",
        guide: "Send any supported video link in chat."
    },

    onStart: async function () {},

    onChat: async function ({ event, api }) {
        try {
            const text = event.body || "";
            const urlMatch = text.match(/https?:\/\/[^\s]+/i);
            if (!urlMatch) return;

            let url = urlMatch[0].replace(/\?$/, "");
            let hostname = parse(url).hostname.toLowerCase();

            // React ⏳ for download started
            api.setMessageReaction("⏳", event.messageID, () => {}, true);

            // Expand TikTok short link
            if (hostname.includes("tiktok") && url.includes("vt.tiktok.com")) {
                url = await expandTikTokUrl(url);
                hostname = parse(url).hostname.toLowerCase();
            }

            // Determine which API endpoint to use
            let apiEndpoint = null;
            for (const key in PLATFORM_API_MAP) {
                if (hostname.includes(key)) {
                    apiEndpoint = PLATFORM_API_MAP[key];
                    break;
                }
            }
            if (!apiEndpoint) return; // Unsupported platform

            // Build API URL
            let apiUrl;
            if (apiEndpoint.startsWith("http")) {
                apiUrl = `${apiEndpoint}${encodeURIComponent(url)}`; // Custom API
            } else {
                apiUrl = `https://universaldownloaderapi.vercel.app${apiEndpoint}?url=${encodeURIComponent(url)}`;
            }

            const res = await axios.get(apiUrl, { timeout: 30000 });
            const data = res.data;

            // Determine video URL
            let videoUrl = null;

            if (hostname.includes("instagram") || hostname.includes("facebook") || hostname.includes("meta")) {
                if (data?.data?.data?.length > 0 && data.data.data[0].url) {
                    videoUrl = data.data.data[0].url;
                }
            } 
            else if (hostname.includes("tiktok")) {
                if (data?.status && data?.data?.meta?.media?.length > 0) {
                    const media = data.data.meta.media[0];
                    videoUrl = media.hd || media.org || null;
                }
            } 
            else if (hostname.includes("youtube")) {
                if (data?.status && data?.result?.status && data?.result?.mp4) {
                    videoUrl = data.result.mp4;
                }
            } 
            else if ((hostname.includes("reddit") || hostname.includes("twitter") || hostname.includes("x.com")) && data?.data?.[0]?.video_url) {
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

            // React ✅ when finished
            api.setMessageReaction("✅", event.messageID, () => {}, true);

            // Send file
            api.sendMessage({ attachment: fs.createReadStream(filePath) }, event.threadID, () => {
                // Delete cached file after sending
                fs.unlinkSync(filePath);
            }, event.messageID);

        } catch (err) {
            console.error(err);
            api.setMessageReaction("💔", event.messageID, () => {}, true);
        }
    }
};
