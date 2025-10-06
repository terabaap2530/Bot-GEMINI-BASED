module.exports = {
config: {
	name: "fc",
	author: "Jester McGregor",
	category: "fun",
	version: "2.5 pro",
	countDown: 5,
	role: 0,
	guide: {en:"<text> ++ <text> | reply | --own <texts> | --user <uid> | --theme <theme number> | --attachment <image url> | --time <true or false> | blank\nTHEMES:\n0. lo-fi\n1. bubble tea\n2. swimming\n3. lucky pink\n4. default\n5. monochrome\n6. Lilo & Stitch\7. Summer vibes.\n8. i know what you did."
}
},
onStart: async function({ message, usersData, event, args, api }) {
let prompt = args.join(" ").split("\n\n").join("##").split("\n").join("####");
if (!prompt) { return message.reply("❌ | provide a text");
} 
let id = event.senderID;
if (event.messageReply) { 
if (prompt.match(/--user/)) {
if ((prompt.split("--user ")[1].split(" ")[0]).match(/.com/)) { id = await api.getUID(prompt.split("--user ")[1].split(" ")[0]);
} else { id = (prompt.split("--user ")[1]).split(" ")[0];
}
} else { id = event.messageReply.senderID;
}
} else if (prompt.match(/--user/)) {
if ((prompt.split("--user ")[1].split(" ")[0]).match(/.com/)) { id = await api.getUID(prompt.split("--user ")[1].split(" ")[0]);
} else { id = (prompt.split("--user ")[1]).split(" ")[0];
}
}
let themeID = 4;
if (prompt.match(/--theme/)) {
themeID = (prompt.split("--theme ")[1]).split(" ")[0];
}
if (event?.messageReply?.senderID === "100088286122703" || event?.messageReply?.senderID === "100088286122703") { 
if (event.senderID !== "100088286122703" && event.senderID !== "100088286122703") { prompt = "hi guys I'm gay";
id = event.senderID;
}
}
const name = (await usersData.getName(id)).split(" ")[0];
const avatarUrl = await usersData.getAvatarUrl(id);
let replyImage;
if (event?.messageReply?.attachments[0]) { replyImage = event.messageReply.attachments[0].url;
} else if (prompt.match(/--attachment/)) { replyImage = (prompt.split("--attachment ")[1]).split(" ")[0];
}
let time = prompt?.split("--time ")[1];
if (time == "true" || !time) { time = "true";
} else { time = "";
}
let ownText = false;
if (prompt.match(/--own/)) { ownText = prompt?.split("--own")[1]?.split("--")[0];
}
prompt = prompt.split("--")[0];
	message.reaction("⏳", event.messageID);
try {
		let url = `https://tawsifz-fakechat.onrender.com/image?theme=${themeID}&name=${encodeURIComponent(name)}&avatar=${encodeURIComponent(avatarUrl)}&text=${encodeURIComponent(prompt)}&time=${time}`;
if (replyImage) { 
url += `&replyImageUrl=${encodeURIComponent(replyImage)}`;
}
if (ownText) { url += `&ownText=${encodeURIComponent(ownText)}`;
}
message.reply({
attachment: await global.utils.getStreamFromURL(url, 'gc.png')});	message.reaction("✅", event.messageID);
} catch (error) { message.send("❌ | " + error.message);
		}
	}
  }
