const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

// 🔥 TEMPORARY allowed list (RAM only)
let tempAllowed = {};

module.exports = {
  config: {
    name: "waiko",
    aliases: ["w"],
    version: "2.1",
    author: "Denish (Owner)",
    role: 0,
    shortDescription: "Waifu/Neko (admins + temporary added users)",
    longDescription: "Allows admins, owners and temporarily added users",
    category: "fun"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, senderID, mentions, body } = event;

    // ✅ Owners (your + added UID)
    const owners = [
      "100004730585694",
      "100072165005153",
      "100000288962595"   // NEW OWNER UID ADDED
    ];

    // Get admin list
    const info = await api.getThreadInfo(threadID);
    const adminIDs = info.adminIDs.map(u => u.id);

    // Initialize list for this thread
    if (!tempAllowed[threadID]) tempAllowed[threadID] = [];

    const isOwner = owners.includes(senderID);
    const isAdmin = adminIDs.includes(senderID);
    const isTempAllowed = tempAllowed[threadID].includes(senderID);

    // -----------------------------------
    // 🔥 ADD TEMPORARY USER (.w add @user)
    // -----------------------------------
    if (args[0] === "add") {
      if (!isOwner && !isAdmin)
        return api.sendMessage("❌ Only admins can use .w add", threadID);

      if (!Object.keys(mentions).length)
        return api.sendMessage("👉 Mention someone to add", threadID);

      const uid = Object.keys(mentions)[0];

      if (tempAllowed[threadID].includes(uid))
        return api.sendMessage("⚠️ Already allowed temporarily.", threadID);

      tempAllowed[threadID].push(uid);

      return api.sendMessage(
        `✅ ${mentions[uid]} can now use .w (temporary)`,
        threadID
      );
    }

    // -----------------------------------
    // 🔥 PERMISSION CHECK
    // -----------------------------------
    if (!isOwner && !isAdmin && !isTempAllowed) {
      return api.sendMessage("❌ You are not allowed to use this command.", threadID);
    }

    // -----------------------------------
    // 🔥 MAIN .W COMMAND
    // -----------------------------------
    let apiUrl;
    const lower = body.toLowerCase();

    if (lower.includes("waifu") || args[0] === "waifu") {
      apiUrl = "https://dens-waifu.vercel.app/api/waifu";
    } else if (lower.includes("neko") || args[0] === "neko") {
      apiUrl = "https://dens-waifu.vercel.app/api/neko";
    } else {
      apiUrl =
        Math.random() < 0.5
          ? "https://dens-waifu.vercel.app/api/waifu"
          : "https://dens-waifu.vercel.app/api/neko";
    }

    try {
      const res = await axios.get(apiUrl);
      const { image, category } = res.data;

      const imgPath = path.join(__dirname, `temp_${Date.now()}.jpg`);
      const img = await axios.get(image, { responseType: "arraybuffer" });
      await fs.writeFile(imgPath, img.data);

      api.sendMessage(
        {
          body: `Category: ${category}`,
          attachment: fs.createReadStream(imgPath)
        },
        threadID,
        () => fs.unlink(imgPath)
      );
    } catch (err) {
      console.error(err);
      api.sendMessage("❌ Failed to fetch image.", threadID);
    }
  }
};
