const axios = require("axios");

module.exports = {
  config: {
    name: "screenshot",
    aliases: ["ss", "webss"],
    version: "1.3",
    author: "Denish",
    role: 0,
    shortDescription: "Silent website screenshot",
    longDescription: "Silently capture screenshot using only reactions.",
    category: "utility",
    guide: "{p}screenshot <url>"
  },

  onStart: async function ({ api, event, args }) {
    try {
      let url = args.join(" ").trim();

      // No URL
      if (!url) {
        api.setMessageReaction("⚠️", event.messageID, () => {}, true);
        return;
      }

      // Add https:// if missing
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }

      // React: Processing
      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      const apiURL = `https://screenshot-api-bxwt.onrender.com/api/screenshot?site=${encodeURIComponent(url)}`;

      const res = await axios.get(apiURL, {
        responseType: "stream",
        timeout: 20000
      });

      res.data.path = "screenshot.png";

      // Send screenshot silently
      await api.sendMessage(
        { attachment: res.data },
        event.threadID,
        () => {},
        event.messageID
      );

      // Success Reaction
      api.setMessageReaction("✅", event.messageID, () => {}, true);

    } catch (e) {
      console.log("Screenshot Error:", e.message);

      // Error Reaction
      api.setMessageReaction("❌", event.messageID, () => {}, true);
    }
  }
};
