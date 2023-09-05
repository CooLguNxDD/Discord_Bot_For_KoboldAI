
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Reset the Bot'),
    async execute(interaction) {
        await interaction.reply('RESET!!!!!!!!!!!!!!!!!');
    },
};
