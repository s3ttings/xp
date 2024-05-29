const { SlashCommandBuilder } = require('@discordjs/builders');
const GuildSettings = require('../models/guildSettings');
const { PermissionsBitField } = require('discord.js'); // Importação corrigida

module.exports = {
  data: new SlashCommandBuilder()
    .setName('msgxp')
    .setDescription('Configurações de XP por mensagens')
    .addSubcommand(subcommand =>
      subcommand
        .setName('enable')
        .setDescription('Ativa ou desativa o ganho de XP por mensagens')
        .addStringOption(option => option.setName('status').setDescription('on ou off').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('stack')
        .setDescription('Ativa ou desativa o empilhamento de cargos de nível')
        .addStringOption(option => option.setName('status').setDescription('on ou off').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('roles')
        .setDescription('Gerencia os cargos de nível')
        .addStringOption(option => option.setName('action').setDescription('set ou remove').setRequired(true))
        .addRoleOption(option => option.setName('role').setDescription('Cargo').setRequired(false))
        .addIntegerOption(option => option.setName('xp').setDescription('XP necessário').setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('user')
        .setDescription('Gerencia o XP dos usuários')
        .addStringOption(option => option.setName('action').setDescription('add, remove ou set').setRequired(true))
        .addIntegerOption(option => option.setName('xp').setDescription('XP').setRequired(true))
        .addUserOption(option => option.setName('user').setDescription('Usuário').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('ignore')
        .setDescription('Gerencia ignorados (roles ou canais)')
        .addStringOption(option => option.setName('type').setDescription('role ou channel').setRequired(true))
        .addStringOption(option => option.setName('action').setDescription('add ou remove').setRequired(true))
        .addMentionableOption(option => option.setName('target').setDescription('Role ou Canal').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('notify')
        .setDescription('Configura a notificação de ganho de nível')
        .addStringOption(option => option.setName('method').setDescription('default, none, dm ou channel').setRequired(true))
        .addChannelOption(option => option.setName('channel').setDescription('Canal para notificação').setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('Mostra as configurações atuais de XP')),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const subcommand = interaction.options.getSubcommand();
    const settings = await GuildSettings.findOne({ guildId }) || new GuildSettings({ guildId });

    // Verificação de permissões corrigida
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return interaction.reply('Você não tem permissão para usar este comando.');
    }

    switch (subcommand) {
      case 'enable':
        const enableStatus = interaction.options.getString('status') === 'on';
        settings.xpEnabled = enableStatus;
        await settings.save();
        interaction.reply(`Ganho de XP por mensagens ${enableStatus ? 'ativado' : 'desativado'}.`);
        break;

      case 'stack':
        const stackStatus = interaction.options.getString('status') === 'on';
        settings.stackRoles = stackStatus;
        await settings.save();
        interaction.reply(`Empilhamento de cargos ${stackStatus ? 'ativado' : 'desativado'}.`);
        break;

      case 'roles':
        const action = interaction.options.getString('action');
        const role = interaction.options.getRole('role');
        const xp = interaction.options.getInteger('xp');

        if (action === 'set' && role && xp) {
          settings.xpRoles.set(role.id, xp);
          await settings.save();
          interaction.reply(`Cargo ${role.name} configurado para ser dado ao atingir ${xp} XP.`);
        } else if (action === 'remove' && role) {
          settings.xpRoles.delete(role.id);
          await settings.save();
          interaction.reply(`Cargo ${role.name} removido.`);
        } else if (action === 'remove' && role === null) {
          settings.xpRoles.clear();
          await settings.save();
          interaction.reply(`Todos os cargos de XP foram removidos.`);
        } else {
          interaction.reply('Ação inválida ou parâmetros insuficientes.');
        }
        break;

      case 'user':
        const userAction = interaction.options.getString('action');
        const userXP = interaction.options.getInteger('xp');
        const user = interaction.options.getUser('user');

        let targetUser = await User.findOne({ userId: user.id, guildId });
        if (!targetUser) {
          targetUser = new User({ userId: user.id, guildId });
        }

        if (userAction === 'add') {
          targetUser.xp += userXP;
        } else if (userAction === 'remove') {
          targetUser.xp = Math.max(0, targetUser.xp - userXP);
        } else if (userAction === 'set') {
          targetUser.xp = userXP;
        } else {
          return interaction.reply('Ação inválida.');
        }

        await targetUser.save();
        interaction.reply(`XP de ${user.username} atualizado para ${targetUser.xp}.`);
        break;

      case 'ignore':
        const type = interaction.options.getString('type');
        const ignoreAction = interaction.options.getString('action');
        const target = interaction.options.getMentionable('target');

        if (type === 'role') {
          if (ignoreAction === 'add') {
            settings.ignoreRoles.push(target.id);
          } else if (ignoreAction === 'remove') {
            settings.ignoreRoles = settings.ignoreRoles.filter(roleId => roleId !== target.id);
          }
        } else if (type === 'channel') {
          if (ignoreAction === 'add') {
            settings.ignoreChannels.push(target.id);
          } else if (ignoreAction === 'remove') {
            settings.ignoreChannels = settings.ignoreChannels.filter(channelId => channelId !== target.id);
          }
        } else {
          return interaction.reply('Tipo inválido.');
        }

        await settings.save();
        interaction.reply(`${type} ${ignoreAction} ${target.toString()} atualizado.`);
        break;

      case 'notify':
        const notifyMethod = interaction.options.getString('method');
        const notifyChannel = interaction.options.getChannel('channel');

        settings.notifyMethod = notifyMethod;
        if (notifyMethod === 'channel' && notifyChannel) {
          settings.notifyChannel = notifyChannel.id;
        }
        await settings.save();
        interaction.reply(`Método de notificação atualizado para ${notifyMethod}.`);
        break;

      case 'view':
        const viewSettings = `
          **XP Ativado:** ${settings.xpEnabled}
          **Empilhamento de Cargos:** ${settings.stackRoles}
          **Método de Notificação:** ${settings.notifyMethod}
          **Cargos de XP:**
          ${Array.from(settings.xpRoles.entries()).map(([roleId, xp]) => `<@&${roleId}> - ${xp} XP`).join('\n')}
        `;
        interaction.reply(viewSettings);
        break;

      default:
        interaction.reply('Comando inválido.');
        break;
    }
  },
};