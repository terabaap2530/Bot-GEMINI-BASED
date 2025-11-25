const { loadImage, createCanvas } = require("canvas");
const fs = require("fs-extra");
const axios = require("axios");

module.exports = {
  config: {
    name: "hack",
    author: "Lord Denish",
    countDown: 5,
    role: 2,
    category: "fun"
  },

  wrapText: async (ctx, text, maxWidth) => {
    return new Promise((resolve) => {
      if (ctx.measureText(text).width < maxWidth) return resolve([text]);
      const words = text.split(" ");
      const lines = [];
      let line = "";

      while (words.length > 0) {
        if (ctx.measureText(line + words[0]).width < maxWidth) {
          line += words.shift() + " ";
        } else {
          lines.push(line.trim());
          line = "";
        }
        if (words.length === 0) lines.push(line.trim());
      }
      resolve(lines);
    });
  },

  onStart: async function ({ api, event }) {
    const dir = __dirname + "/tmp";
    fs.ensureDirSync(dir);

    const bgPath = dir + "/bg.png";
    const avtPath = dir + "/avt.png";

    const id = Object.keys(event.mentions)[0] || event.senderID;
    const info = await api.getUserInfo(id);
    const name = info[id].name;

    const bgURL = "https://drive.usercontent.google.com/download?id=1RwJnJTzUmwOmP3N_mZzxtp63wbvt9bLZ";

    const avt = (
      await axios.get(
        `https://graph.facebook.com/${id}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
        { responseType: "arraybuffer" }
      )
    ).data;

    fs.writeFileSync(avtPath, Buffer.from(avt, "utf-8"));

    const bg = (
      await axios.get(bgURL, { responseType: "arraybuffer" })
    ).data;

    fs.writeFileSync(bgPath, Buffer.from(bg, "utf-8"));

    const base = await loadImage(bgPath);
    const avatar = await loadImage(avtPath);

    const canvas = createCanvas(base.width, base.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(base, 0, 0, canvas.width, canvas.height);
    ctx.font = "400 23px Arial";
    ctx.fillStyle = "#1878F3";

    const lines = await this.wrapText(ctx, name, 1160);
    ctx.fillText(lines.join("\n"), 200, 497);

    ctx.drawImage(avatar, 83, 437, 100, 101);

    fs.writeFileSync(bgPath, canvas.toBuffer());
    fs.removeSync(avtPath);

    return api.sendMessage(
      {
        attachment: fs.createReadStream(bgPath)
      },
      event.threadID,
      () => fs.unlinkSync(bgPath),
      event.messageID
    );
  }
};
