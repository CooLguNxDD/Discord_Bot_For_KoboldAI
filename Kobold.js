require('dotenv/config');

var newClient = require('node-rest-client').Client;
var newclient = new newClient();

const axios = require('axios');

const fs = require('node:fs');
const path = require('node:path');

const { Client, IntentsBitField, Collection, Events, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    GatewayIntentBits.Guilds,
  ],
});

//dynamically read command files

//https://discordjs.guide/creating-your-bot/command-handling.html#loading-command-files

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

let ExecuteCommand = async (interaction)=>{

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}
	try {
		await command.execute(interaction);

        if(interaction.replied && interaction.commandName == "reset"){
            counter = 1;
            console.log("counter reset:" + counter);
        }
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
}


//Receiving command interactions
client.on(Events.InteractionCreate, interaction => {
	if (!interaction.isChatInputCommand()) return;
    ExecuteCommand(interaction);
	console.log(interaction);
});

let guild;
let BotName;

//history counter
let counter;

//get discord infomation
client.on('ready', () => {
    console.log('The bot is online!');

    let bot_id = client.user.id;
    counter = 1;
    let membersList;
    //server name
    guild = client.guilds.cache.get(process.env.DISCORD_SERVER_ID);

    //get members
    membersList = guild.members.cache.filter((id)=> id == bot_id);

    //map the display name for the bot in the server
    displayNameList = membersList.map(member => member.displayName)

    BotName = displayNameList[0];
    console.log("Bot name: ", displayNameList[0])
});

client.on('messageCreate', async (message) => {
    //ignore message from this bot
    if (message.author.bot) return;
    //should match channel id
    if (message.channel.id !== process.env.CHANNEL_ID) return;

    //cmd
    if (message.content.startsWith('!')) return;

    //start tag
    let conversationLog = "<START>\n";

    try {

        //next msg
        await message.channel.sendTyping();

        //fetch msg + history
        let prevMessages = await message.channel.messages.fetch({ limit: counter });
        prevMessages.reverse();
        
        prevMessages.forEach((msg) => {
            if (msg.content.startsWith('!')) return;
            if (msg.author.id !== client.user.id && message.author.bot) return;

            //use discord user display name
            membersList = guild.members.cache.filter((id)=> id == msg.author.id);
            displayNameList = membersList.map(member => member.displayName)
            displayName = displayNameList[0];

            // if bot
            if (msg.author.id == client.user.id) {
                conversationLog += BotName +": ";
                conversationLog += msg.content +"\n";
            }
            // if discord user
            else {
                conversationLog += "You: "
                conversationLog += msg.content+"\n";
            }
        });

        conversationLog = conversationLog.replace("~", "");
        
        conversationLog += BotName +": ";

        const apiUrl = process.env.KOBOLD_API_URL + 'v1/generate';

        let newPrompt = conversationLog;

        // config
        let this_settings = {
            prompt: newPrompt,
            use_story:false,
            use_memory:false,
            use_authors_note:false,
            use_world_info:false,
            max_context_length: 2048,
            max_length: 200,
            rep_pen: 1.05,
            rep_pen_range: 1024,
            rep_pen_slope: 0.9,
            temperature: 1,
            tfs: 0.9,
            top_a: 0,
            top_k: 40,
            top_p: 0.9,
            typical: 1,
            sampler_order: [6, 0, 1, 2, 3, 4, 5],
            };

        // console.log(this_settings);
        var args = {
            data: this_settings,
            headers: { "Content-Type": "application/json" },
        };

        await newclient.post(apiUrl, args, function (data, response){
            // console.log(response);
            // console.log(data)
            if(response.statusCode == 200)
                message.reply(data.results[0].text);

                if(counter < 50){
                    counter+=1;
                }
            }
        )
        
    } catch (error) {
        console.log(`ERR: ${error}`);
    }
    });


client.login(process.env.TOKEN);


