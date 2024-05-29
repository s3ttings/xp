const { SlashCommandBuilder } = require('@discordjs/builders');
const GuildSettings = require('../models/guildSettings');
const { PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voicexp')
    .setDescription('Configurações de XP por voz')
    .addSubcommand(subcommand =>
      subcommand
        .setName('enable')
        .setDescription('Ativa o ganho de XP por voz')
        .addIntegerOption(option => option.setName('cooldown').setDescription('Tempo de espera em minutos').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Desativa o ganho de XP por voz'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('ignore')
        .setDescription('Gerencia canais de voz ignorados')
        .addStringOption(option => option.setName('action').setDescription('add ou remove').setRequired(true))
        .addChannelOption(option => option.setName('channel').setDescription('Canal').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('Mostra as configurações atuais de XP por voz')),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const subcommand = interaction.options.getSubcommand();
    const settings = await GuildSettings.findOne({ guildId }) || new GuildSettings({ guildId });

    if (!interaction.member.permissions.has(PermissionsBitField.FLAGS.MANAGE_GUILD)) {
      return interaction.reply('Você não tem permissão para usar este comando.');
    }

    switch (subcommand) {
      case 'enable':
        const cooldown = interaction.options.getInteger('cooldown');
        settings.voiceXPEnabled = true;
        settings.voiceXPCooldown = cooldown;
        await settings.save();
        interaction.reply(`Ganho de XP por voz ativado com um tempo de espera de ${cooldown} minutos.`);
        break;

      case 'disable':
        settings.voiceXPEnabled = false;
        await settings.save();
        interaction.reply('Ganho de XP por voz desativado.');
        break;

      case 'ignore':
        const action = interaction.options.getString('action');
        const channel = interaction.options.getChannel('channel');

        if (action === 'add') {
          settings.voiceIgnoreChannels.push(channel.id);
        } else if (action === 'remove') {
          settings.voiceIgnoreChannels = settings.voiceIgnoreChannels.filter(channelId => channelId !== channel.id);
        } else {
          return interaction.reply('Ação inválida.');
        }

        await settings.save();
        interaction.reply(`Canal de voz ${action} ${channel.name} atualizado.`);
        break;

      case 'view':
        const viewSettings = `
          **XP por Voz Ativado:** ${settings.voiceXPEnabled}
          **Tempo de Espera:** ${settings.voiceXPCooldown} minutos
          **Canais Ignorados:** ${settings.voiceIgnoreChannels.map(channelId => `<#${channelId}>`).join(', ')}
        `;

        interaction.reply(viewSettings);
        break;

      default:
        interaction.reply('Comando inválido.');
        break;
    }
  },
};