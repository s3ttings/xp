const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const User = require('../models/user');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xp')
    .setDescription('Mostra o seu XP atual')
    .addUserOption(option => option.setName('user').setDescription('Usuário para verificar o XP')),
  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: target.id, guildId: interaction.guild.id });

    if (!user) {
      return interaction.reply(`${target.username} ainda não tem XP.`);
    }

    const xpProgress = Math.floor((user.xp % 100) / 10); // Calcula a porcentagem de progresso em dezenas
    const progressBar = '⬜'.repeat(xpProgress) + '🟦'.repeat(10 - xpProgress); // Cria a barra de progresso com emojis

    const xpEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`${target.username}'s XP e Nível`)
      .setThumbnail(target.displayAvatarURL()) // Add user's avatar
      .setDescription(`Você tem ${user.xp} XP e está no nível ${user.level}.\nProgresso: ${progressBar}`);

    interaction.reply({ embeds: [xpEmbed] });
  },
};