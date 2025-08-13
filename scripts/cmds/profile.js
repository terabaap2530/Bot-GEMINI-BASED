module.exports = {
	config: {
		name: "profile",
		aliases: ["pfp", "p"],
		version: "1.3",
		author: "Denish",
		countDown: 5,
		role: 0,
		shortDescription: "Get profile picture & info",
		longDescription: "Fetches the profile picture and basic info of yourself, a tagged user, or a replied user.",
		category: "image",
		guide: {
			en: "{pn} @tag | {pn} (reply) | {pn} (no mention for your own profile)"
		}
	},

	onStart: async function ({ event, message, usersData }) {
		try {
			let targetUID;

			// Determine target user
			if (event.type === "message_reply") {
				targetUID = event.messageReply.senderID;
			} else if (Object.keys(event.mentions).length > 0) {
				targetUID = Object.keys(event.mentions)[0];
			} else {
				targetUID = event.senderID;
			}

			// Fetch user info & avatar
			const userInfo = await usersData.get(targetUID);
			const avatarURL = await usersData.getAvatarUrl(targetUID);

			// Prepare info text
			let infoText = `👤 Name: ${userInfo.name || "Unknown"}\n`;
			infoText += `🆔 UID: ${targetUID}\n`;
			infoText += `🚻 Gender: ${userInfo.gender || "Unknown"}\n`;
			infoText += `📅 Birthday: ${userInfo.birthday || "Not available"}`;

			// Send profile picture with info
			message.reply({
				body: infoText,
				attachment: await global.utils.getStreamFromURL(avatarURL)
			});

		} catch (err) {
			console.error(err);
			message.reply("❌ Failed to fetch profile information.");
		}
	}
};
