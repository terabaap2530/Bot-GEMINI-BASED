const axios = require("axios");
const fs = require("fs-extra");
const os = require("os");
const path = require("path");
const { createCanvas, loadImage, registerFont } = require("canvas");
const { execSync } = require("child_process");

module.exports = {
  config: {
    name: "uptime2",
    aliases: ["upt", "botstatus"],
    version: "2.5",
    author: "Lord Denish",
    role: 0,
    shortDescription: { en: "Bot uptime, stats & system info with Robin theme." },
    longDescription: { en: "Generates a clean system report with uptime, stats, Node.js version and optional Robin profile circle." },
    category: "info",
    guide: { en: "{p}uptime2" }
  },

  onStart: async function ({ api, event }) {
    const startTime = Date.now();
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);

    try {
      // Register font
      try {
        const fontPath = path.join(__dirname, "Poppins-Bold.ttf");
        if (fs.existsSync(fontPath)) registerFont(fontPath, { family: "Poppins" });
      } catch (e) {
        console.log("Font load failed, using default Arial.");
      }

      // ----- Fetch Robin Avatar -----
      let robinImg = null;
      try {
        const response = await axios.get("https://denish-pin.vercel.app/api/search-download?query=robin");
        const images = response.data?.data;
        if (images && images.length > 0) {
          const imageResponse = await axios.get(images[0], { responseType: "arraybuffer" });
          robinImg = await loadImage(Buffer.from(imageResponse.data, "binary"));
        }
      } catch (e) {
        console.log("Failed to fetch Robin image, using fallback.");
        const fallbackPath = path.join(__dirname, "robin.jpg");
        if (fs.existsSync(fallbackPath)) robinImg = await loadImage(fallbackPath);
      }

      // ----- Stats -----
      const uptime = formatUptime(process.uptime());
      const ping = Date.now() - startTime;

      const threads = await api.getThreadList(100, null, ["INBOX"]);
      const groups = threads.filter(t => t.isGroup);
      const users = new Set();
      for (const g of groups) {
        try {
          const info = await api.getThreadInfo(g.threadID);
          info.participantIDs.forEach(id => users.add(id));
        } catch {}
      }

      const botStats = {
        uptime,
        users: users.size,
        groups: groups.length,
        threads: threads.length,
        node: process.version,
        ping: ping
      };

      const sys = {
        os: os.platform().toUpperCase(),
        cpu: os.cpus().length,
        ram: `${(os.totalmem() / 1024 ** 3).toFixed(2)} GB`
      };
      const disk = getDiskUsage();

      // ----- Canvas -----
      const width = 1000, height = 650;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // Background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // Robin avatar (top-right)
      if (robinImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(width - 120, 120, 80, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(robinImg, width - 200, 40, 160, 160);
        ctx.restore();
      }

      // Title
      ctx.font = "bold 48px Poppins, Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = "#007bff";
      ctx.shadowColor = "#007bff";
      ctx.shadowBlur = 25;
      ctx.fillText("⚡ BOT STATUS ⚡", width / 2, 180);

      // Stats lines
      ctx.font = "32px Poppins, Arial";
      ctx.shadowColor = "#444";
      ctx.shadowBlur = 10;

      const lines = [
        `🕒 Uptime: ${botStats.uptime}`,
        `👥 Users: ${botStats.users} | Groups: ${botStats.groups}`,
        `💬 Threads: ${botStats.threads}`,
        `⚙️ Node.js: ${botStats.node}`,
        `💻 OS: ${sys.os} | CPU: ${sys.cpu} cores`,
        `📡 Ping: ${botStats.ping}ms`,
        `💾 RAM: ${sys.ram} | Disk: ${disk.used}/${disk.total}`
      ];
      lines.forEach((line, i) => {
        const y = 250 + i * 55;
        ctx.fillText(line, width / 2, y);
      });

      // Save + send
      const imgPath = path.join(cacheDir, "uptime2.png");
      await fs.outputFile(imgPath, canvas.toBuffer("image/png"));

      await api.sendMessage({
        body: "📊 Bot Status Report",
        attachment: fs.createReadStream(imgPath)
      }, event.threadID);

      fs.unlink(imgPath).catch(() => {});

    } catch (err) {
      console.error("uptime2 error:", err);
      return api.sendMessage("⚠️ Failed to generate uptime2 image. Error: " + err.message, event.threadID);
    }
  }
};

// ----- Helpers -----
function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d ? d + "d " : ""}${h ? h + "h " : ""}${m ? m + "m " : ""}${s}s`;
}

function getDiskUsage() {
  try {
    const stdout = execSync("df -h /").toString();
    const lines = stdout.trim().split("\n");
    const parts = lines[1].split(/\s+/);
    return { total: parts[1], used: parts[2], available: parts[3] };
  } catch {
    return { total: "N/A", used: "N/A", available: "N/A" };
  }
    }
