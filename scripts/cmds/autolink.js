const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { parse } = require("url");

// Map hostnames to API endpoints
const PLATFORM_API_MAP = {
    "instagram": "https://universal-dl-one.vercel.app/api/instagram?url=",
    "facebook": "https://universal-dl-one.vercel.app/api/facebook?url=",
    "youtube": "https://universal-dl-one.vercel.app/api/youtube?url=",
    "tiktok": "https://universal-dl-one.vercel.app/api/tiktok?url="
};

// Expand short TikTok links
async function expandTikTokUrl(shortUrl) {
    try {
        const res = await axios.get(shortUrl, { maxRedirects: 0, validateStatus: s => s >= 200 && s < 400 });
        if (res.status === 301 || res.status === 302) return res.headers.location;
        return shortUrl;
    } catch (err) {
        if (err.response && (err.response.status === 301 || err.response.status === 302)) return err.response.headers.location;
        return shortUrl;
    }
}

// Extract video URL and title
function extractVideoData(hostname, data) {
    let videoUrl = null;
    let title = "Video";

    if (hostname.includes("instagram")) {
        videoUrl = data.downloads?.[data.downloads.length - 1] || data.result?.url;
        title = data.result?.title || "Instagram Video";
    } else if (hostname.includes("tiktok")) {
        videoUrl = data.result?.link;
        title = data.result?.title || "TikTok Video";
    } else if (hostname.includes("youtube")) {
        videoUrl = data.result?.mp4;
        title = data.result?.title || "YouTube Video";
    } else if (hostname.includes("facebook")) {
        videoUrl = data.result?.data?.[0]?.hd_link || data.result?.data?.[0]?.sd_link;
        title = data.result?.title || "Facebook Video";
    }

    return { videoUrl, title };
}

module.exports = {
    config: {
        name: "autolink",
        version: "2.0",
        author: "Lord Denish",
        shortDescription: "Automatically downloads video links from messages",
        category: "media"
    },

    // REQUIRED: fixes installation
    onStart: async function() {
        console.log("Autolink installed and ready!");
    },

    // Trigger automatically on any message
    onChat: async function({ event, api }) {
        try {
            const text = event.body || "";
            const urls = text.match(/https?:\/\/[^\s]+/gi);
            if (!urls || urls.length === 0) return;

            for (let url of urls) {
                url = url.replace(/\?$/, "");
                let hostname = parse(url).hostname.toLowerCase();

                api.setMessageReaction("⏳", event.messageID, null, true);

                // Expand TikTok short links
                if (hostname.includes("tiktok") && url.includes("vt.tiktok.com")) {
                    url = await expandTikTokUrl(url);
                    hostname = parse(url).hostname.toLowerCase();
                }

                // Select API
                let apiEndpoint = null;
                for (const key in PLATFORM_API_MAP) {
                    if (hostname.includes(key)) {
                        apiEndpoint = PLATFORM_API_MAP[key];
                        break;
                    }
                }
                if (!apiEndpoint) continue;

                const apiUrl = `${apiEndpoint}${encodeURIComponent(url)}`;
                const res = await axios.get(apiUrl, { timeout: 30000 });
                const data = res.data;

                const { videoUrl, title } = extractVideoData(hostname, data);
                if (!videoUrl) {
                    api.setMessageReaction("💔", event.messageID, null, true);
                    continue;
                }

                // Download video temporarily
                const cacheDir = path.join(__dirname, "cache");
                if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
                const filePath = path.join(cacheDir, `video_${Date.now()}.mp4`);

                const response = await axios({ method: "GET", url: videoUrl, responseType: "stream", timeout: 60000 });
                const writer = fs.createWriteStream(filePath);
                response.data.pipe(writer);
                await new Promise(r => writer.on("finish", r));

                // Send video
                const stream = fs.createReadStream(filePath);
                await api.sendMessage({ body: `🎬 ${title}\n🌐 Platform: ${hostname}`, attachment: stream }, event.threadID, event.messageID);

                api.setMessageReaction("✅", event.messageID, null, true);
                fs.unlinkSync(filePath);
            }
        } catch (err) {
            console.error(err);
            api.setMessageReaction("💔", event.messageID, null, true);
        }
    }
};
