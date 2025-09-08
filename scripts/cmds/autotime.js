const axios = require("axios");

// Object to store ON/OFF status per thread
const autoTimeThreads = {};
const activeIntervals = {};

module.exports = {
  config: {
    name: "autotime",
    aliases: ["timebot", "hourly"],
    version: "3.0",
    author: "Lord Denish",
    role: 0,
    shortDescription: "Per-thread hourly notifier",
    longDescription: "Sends hourly Nepal Time updates with quotes and random questions. Default OFF. Supports per-thread ON/OFF.",
    category: "utility",
    guide: "{p}autotime on\n{p}autotime off"
  },

  onStart: async function ({ api, event, args }) {
    const threadID = event.threadID;
    const subCommand = args[0]?.toLowerCase();

    // Turn ON AutoTime
    if (subCommand === "on") {
      if (autoTimeThreads[threadID]) {
        return api.sendMessage("⚠️ AutoTime is already ON in this group!", threadID);
      }

      autoTimeThreads[threadID] = true;
      api.sendMessage("✅ AutoTime started for this thread! Hourly updates will be sent here.", threadID);

      // Create interval for this thread only
      activeIntervals[threadID] = setInterval(async () => {
        try {
          const now = new Date();
          const nepalTime = new Date(now.getTime() + (5 * 60 + 45) * 60000);

          const hours = nepalTime.getHours();
          const minutes = nepalTime.getMinutes();

          // Send only when minutes = 0 (start of hour)
          if (minutes !== 0) return;

          const nextHour = (hours + 1) % 24;

          // Fetch motivational quote
          let quote = "Stay motivated!";
          let author = "Unknown";
          try {
            const quoteRes = await axios.get("https://motivational-api-theta.vercel.app/random");
            quote = quoteRes.data?.quote || quote;
            author = quoteRes.data?.author || author;
          } catch {}

          // Random question
          const questions = [
            "What’s one thing you’re grateful for today?",
            "What did you learn in the last hour?",
            "If you could improve one thing right now, what would it be?",
            "Who inspires you the most?",
            "What’s your next goal for today?"
          ];
          const randomQ = questions[Math.floor(Math.random() * questions.length)];

          const msg =
            `⏰ ${hours}:00 Nepal Time has begun!\n\n` +
            `✅ This hour will end at ${nextHour}:00.\n\n` +
            `💡 Quote: "${quote}" — ${author}\n\n` +
            `❓ Question: ${randomQ}`;

          api.sendMessage(msg, threadID);
        } catch (err) {
          console.error("AutoTime error:", err);
        }
      }, 60 * 1000);

    }
    // Turn OFF AutoTime
    else if (subCommand === "off") {
      if (!autoTimeThreads[threadID]) {
        return api.sendMessage("⚠️ AutoTime is already OFF in this group!", threadID);
      }

      // Stop interval & remove status
      clearInterval(activeIntervals[threadID]);
      delete activeIntervals[threadID];
      delete autoTimeThreads[threadID];

      api.sendMessage("🛑 AutoTime stopped for this thread. No more hourly updates here.", threadID);

    }
    // Help Message
    else {
      api.sendMessage(
        "📌 Usage:\n" +
        "• autotime on → Start hourly updates for **this thread**\n" +
        "• autotime off → Stop hourly updates for **this thread**",
        threadID
      );
    }
  }
};
