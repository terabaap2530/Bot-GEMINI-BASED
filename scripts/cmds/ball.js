const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "ball",
    aliases: ["geda"],
    version: "2.1",
    author: "ItachiInx1de",
    countDown: 5,
    role: 0,
    shortDescription: "Tag someone to kick their ball 😹",
    longDescription: "Fun football meme with avatars",
    category: "fun",
    guide: {
      en: "{pn} @mention"
    }
  },

  langs: {
    en: {
      noTag: "Please mention someone 🗿"
    }
  },

  onStart: async function ({ event, message, usersData }) {
    try {
      const mention = Object.keys(event.mentions);
      if (mention.length === 0) return message.reply(this.langs.en.noTag);

      const uid1 = event.senderID;
      const uid2 = mention[0];

      // Get avatars using usersData
      const avatar1 = await usersData.getAvatarUrl(uid1);
      const avatar2 = await usersData.getAvatarUrl(uid2);

      // API call
      const apiUrl = `https://balls-api-itachi.vercel.app/api/balls?avatar1=${encodeURIComponent(avatar1)}&avatar2=${encodeURIComponent(avatar2)}`;

      // Save image in cache
      const imgPath = path.join(__dirname, "cache", `ball_${Date.now()}.png`);
      const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(imgPath, response.data);

      // Send result
      message.reply({
        body: "Fck your ball 😹",
        attachment: fs.createReadStream(imgPath)
      }, () => fs.unlinkSync(imgPath));

    } catch (err) {
      console.error("Ball cmd error:", err);
      message.reply("❌ | Error generating image");
    }
  }
};
