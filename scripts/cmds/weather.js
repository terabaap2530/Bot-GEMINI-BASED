const axios = require("axios");
const Canvas = require("canvas");
const fs = require("fs-extra");

module.exports = {
  config: {
    name: "weather",
    version: "1.4",
    author: "Denish",
    role: 0,
    countDown: 5,
    description: "Get weather info with image or text",
    category: "Utilities",
    guide: "{pn} <city>"
  },

  onStart: async function({ message, args, api, event }) {
    const city = args.join(" ") || "Kathmandu";

    try {
      // ⏳ React to indicate fetching
      api.setMessageReaction("⏳", event.messageID, (err) => { if (err) console.error(err); });

      // Fetch weather from dens-weather-api
      const res = await axios.get(`https://dens-weather-api.vercel.app/weather?city=${encodeURIComponent(city)}`);
      const data = res.data;

      // Build text message
      const text = `🌐 Weather for ${data.city}:\n🌡 ${data.temperature_c}°C / ${data.temperature_f}°F\n🌦 ${data.weather} ${data.icon}\n💧 Humidity: ${data.humidity}%\n🌬 Wind: ${data.wind_kmph} km/h`;

      try {
        // Generate Canvas image
        const width = 800;
        const height = 400;
        const canvas = Canvas.createCanvas(width, height);
        const ctx = canvas.getContext("2d");

        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "#1e90ff");
        gradient.addColorStop(1, "#00bfff");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Text style
        ctx.fillStyle = "#fff";
        ctx.font = "50px sans-serif";
        ctx.fillText(data.city.toUpperCase(), 50, 80);
        ctx.font = "40px sans-serif";
        ctx.fillText(`${data.icon} ${data.weather}`, 50, 150);
        ctx.fillText(`🌡 ${data.temperature_c}°C / ${data.temperature_f}°F`, 50, 220);
        ctx.fillText(`💧 Humidity: ${data.humidity}%`, 50, 290);
        ctx.fillText(`🌬 Wind: ${data.wind_kmph} km/h`, 50, 360);

        // Thermometer bar
        const tempPercent = Math.min(Math.max(parseInt(data.temperature_c), -10), 40) / 40;
        ctx.fillStyle = "#ff4500";
        ctx.fillRect(700, 50 + (1 - tempPercent) * 300, 50, tempPercent * 300);
        ctx.strokeStyle = "#fff";
        ctx.strokeRect(700, 50, 50, 300);

        // Save image
        await fs.ensureDir(`${__dirname}/tmp`);
        const pathSave = `${__dirname}/tmp/weather_${city}_${Date.now()}.png`;
        fs.writeFileSync(pathSave, canvas.toBuffer());

        // Send text + image
        await message.reply({
          body: text,
          attachment: fs.createReadStream(pathSave)
        });

        // Clean up temp file
        setTimeout(() => { if (fs.existsSync(pathSave)) fs.unlinkSync(pathSave); }, 5000);

      } catch (canvasError) {
        // If Canvas fails, send text only
        console.error("Canvas failed, sending text only:", canvasError.message);
        await message.reply(text);
      }

      // ✅ Done reaction
      api.setMessageReaction("✅", event.messageID, (err) => { if (err) console.error(err); });

    } catch (err) {
      console.error("Weather command error:", err);
      await message.reply("❌ Could not fetch weather. Please check the city name or try again later.");
    }
  }
};
