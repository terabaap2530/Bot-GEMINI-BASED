const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "post",
    aliases: ["fbpost"],
    version: "3.3",
    author: "Lord Denish",
    role: 2,
    shortDescription: "Posts text, images, profile pic, or optional auto-post",
    longDescription:
      "Posts text, images, changes profile picture, or can fetch Pinterest/quote to post manually.",
    category: "owner",
    guide: {
      en: "{p}post <text> (text post)\nAttach an image (image post)\nAttach an image with 'pfp' (profile picture)\nUse {p}post auto to post quote/image manually."
    },
  },

  onStart: async function ({ message, args, event, api, commandName }) {
    // ✅ Only run if the message starts with the command
    if (!event.body.toLowerCase().startsWith(`,${commandName}`)) return;

    const text = args.join(" "); // Only arguments after command
    const attachment = event.attachments && event.attachments[0];
    const firstArg = args[0]?.toLowerCase();

    // 🔹 Profile picture update
    if (firstArg === "pfp" && attachment && attachment.type === "photo") {
      try {
        const imgPath = path.join(__dirname, "newpfp.jpg");
        const res = await axios.get(attachment.url, { responseType: "arraybuffer" });
        await fs.writeFile(imgPath, Buffer.from(res.data, "binary"));

        api.changeAvatar(fs.createReadStream(imgPath), () => {
          fs.unlinkSync(imgPath);
        });
      } catch (e) {
        console.error(e);
      }
      return;
    }

    // 🔹 Image post
    if (attachment && attachment.type === "photo" && firstArg !== "pfp") {
      try {
        const imgPath = path.join(__dirname, "fbtemp.jpg");
        const res = await axios.get(attachment.url, { responseType: "arraybuffer" });
        await fs.writeFile(imgPath, Buffer.from(res.data, "binary"));

        api.createPost(text, fs.createReadStream(imgPath), () => {
          fs.unlinkSync(imgPath);
        });
      } catch (e) {
        console.error(e);
      }
      return;
    }

    // 🔹 Text post only
    if (text && firstArg !== "pfp" && firstArg !== "auto") {
      api.createPost(text, () => {});
      return;
    }

    // 🔹 Manual auto-post
    if (firstArg === "auto") {
      try {
        const isQuote = Math.random() < 0.5;
        let messageText = "";
        let attachmentPath = null;

        if (isQuote) {
          const quoteRes = await axios.get("https://motivational-api-theta.vercel.app/random");
          messageText = quoteRes.data?.quote || "💡 Stay motivated!";
        } else {
          const searchList = ["anime", "landscape", "cyberpunk", "nature"];
          const randomSearch = searchList[Math.floor(Math.random() * searchList.length)];
          const pinApiUrl = `https://denish-pin.vercel.app/api/search-download?query=${encodeURIComponent(randomSearch)}`;
          const pinRes = await axios.get(pinApiUrl, { timeout: 15000 });
          const images = pinRes.data?.data || [];

          if (images.length > 0) {
            const imageUrl = images[Math.floor(Math.random() * images.length)];
            const imgRes = await axios.get(imageUrl, { responseType: "arraybuffer" });
            const cacheDir = path.join(__dirname, "cache");
            await fs.ensureDir(cacheDir);
            attachmentPath = path.join(cacheDir, "autopost.jpg");
            await fs.writeFile(attachmentPath, imgRes.data);
          } else {
            messageText = "💡 Stay motivated!";
          }
        }

        if (attachmentPath) {
          api.createPost(messageText, fs.createReadStream(attachmentPath), () => {
            fs.unlinkSync(attachmentPath);
          });
        } else if (messageText) {
          api.createPost(messageText, () => {});
        }
      } catch (e) {
        console.error("Manual auto-post error:", e.message || e);
      }
      return;
    }
  },
};
