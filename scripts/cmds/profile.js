const ACCESS_TOKEN = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

module.exports = {
  config: {
    name: "profile",
    aliases: ["pfp", "p"],
    version: "1.1",
    author: "MinatoCodes",
    countDown: 5,
    role: 0,
    shortDescription: "PROFILE image",
    longDescription: "PROFILE image",
    category: "image",
    guide: {
      en: "   {pn} @tag"
    }
  },

  onStart: async function ({ event, message, usersData }) {
    let avt;
    const uid1 = event.senderID;
    const uid2 = Object.keys(event.mentions || {})[0];

    if (event.type === "message_reply") {
      avt = await usersData.getAvatarUrl(event.messageReply.senderID);
    } else {
      if (!uid2) {
        avt = `https://graph.facebook.com/${uid1}/picture?width=720&height=720&access_token=${ACCESS_TOKEN}`;
      } else {
        avt = `https://graph.facebook.com/${uid2}/picture?width=720&height=720&access_token=${ACCESS_TOKEN}`;
      }
    }

    return message.reply({
      body: "",
      attachment: await global.utils.getStreamFromURL(avt)
    });
  }
};
