const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const User = require('../models/user');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Mostra o ranking de XP do servidor'),
  async execute(interaction) {
    const topUsers = await User.find({ guildId: interaction.guild.id }).sort({ xp: -1 }).limit(10);

    const rankEmbed = new EmbedBuilder()
    .setColor('#ff9900')
    .setTitle('XP Ranking')
    .setDescription(topUsers.map((user, index) => {
      const member = interaction.guild.members.cache.get(user.userId);
      const username = member ? member.displayName : "Unknown Member";
      return `${index + 1}. ${username} - ${user.xp} XP`;  }).join('\n'));  

    interaction.reply({ embeds: [rankEmbed] });
  },
};