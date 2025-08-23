const axios = require("axios");

module.exports = {
  config: {
    name: "groupinfo",
    version: "2.1",
    author: "Lord Denish",
    role: 0,
    shortDescription: "Group info with admin names and image",
    longDescription: "Shows group name, total members, gender counts, admin names, and group image",
    category: "info",
    guide: "{pn}"
  },

  onStart: async function({ api, event }) {
    try {
      const threadInfo = await api.getThreadInfo(event.threadID);
      const members = threadInfo.participantIDs;
      const admins = threadInfo.adminIDs || [];

      let boys = 0, girls = 0, unknown = 0;
      let adminNames = [];

      for (const id of members) {
        try {
          const user = await api.getUserInfo(id);
          const fullName = user[id].name;
          const firstName = fullName.split(" ")[0];
          const genderRes = await axios.get(`https://api.genderize.io?name=${encodeURIComponent(firstName)}`);
          const gender = genderRes.data.gender;

          if (gender === "male") boys++;
          else if (gender === "female") girls++;
          else unknown++;

          if (admins.includes(id)) adminNames.push(fullName);

        } catch {
          unknown++;
        }
      }

      const msg = `📌 Group Name: ${threadInfo.name}\n` +
                  `👥 Total Members: ${members.length}\n` +
                  `👦 Boys: ${boys}\n` +
                  `👧 Girls: ${girls}\n` +
                  `🛡 Admins: ${admins.length} ${adminNames.length ? `(${adminNames.join(", ")})` : ""}\n` +
                  `❔ Unknown Gender: ${unknown}\n` +
                  `📝 Gender info counts only registered members`;

      api.sendMessage({
        body: msg,
        attachment: await global.utils.getStreamFromURL(threadInfo.imageSrc || threadInfo.imageSrcSmall)
      }, event.threadID);

    } catch (err) {
      console.error(err);
      api.sendMessage("❌ Failed to fetch group information.", event.threadID);
    }
  }
};
