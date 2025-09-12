const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "condom",
    aliases: ["corn"],
    version: "1.1",
    author: "ItachiInx1de",
    countDown: 5,
    role: 0,
    shortDescription: "Funny condom edit",
    longDescription: "Make fun of your tagged friend with a crazy condom fail effect",
    category: "fun",
    guide: {
      en: "{pn} @tag"
    }
  },

  langs: {
    en: {
      noTag: "You must tag the person you want to make funny."
    }
  },

  onStart: async function ({ event, message, usersData }) {
    let avatarUrl;
    const uid1 = event.senderID;
    const uid2 = Object.keys(event.mentions)[0];

    if (event.type === "message_reply") {
      avatarUrl = await usersData.getAvatarUrl(event.messageReply.senderID);
    } else {
      if (!uid2) {
        avatarUrl = await usersData.getAvatarUrl(uid1);
      } else {
        avatarUrl = await usersData.getAvatarUrl(uid2);
      }
    }

    // API call with avatar as query
    const apiUrl = `https://corn-api-itachi.vercel.app/api/corn?avatar=${encodeURIComponent(avatarUrl)}`;

    // Download image to temp folder
    const imagePath = path.join(__dirname, "cache", `condom_${Date.now()}.jpg`);
    try {
      const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(imagePath, response.data);

      // Send message with funny body + image
      message.reply({
        body: "Ops Crazy Condom Fails😆",
        attachment: fs.createReadStream(imagePath)
      }, () => {
        fs.unlinkSync(imagePath); // delete after sending
      });
    } catch (error) {
      console.error("Error fetching from API:", error);
      message.reply("Failed to generate image.");
    }
  }
};
