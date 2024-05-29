const { Client, GatewayIntentBits, Collection, PermissionsBitField, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

const prefix = "!";
const lastMessageTime = new Map();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.guilds.cache.forEach(guild => {
    guild.commands.set(client.commands.map(cmd => cmd.data));
  });
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // Handle prefix commands
  if (message.content.startsWith(prefix)) {
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName);

    if (!command) return;

    try {
      const interaction = {
        member: message.member,
        guild: message.guild,
        channel: message.channel,
        reply: async (response) => {
          if (typeof response === 'string') {
            await message.channel.send(response);
          } else if (response.embeds) {
            await message.channel.send({ embeds: response.embeds });
          }
        },
        options: {
          getString: (name) => args[0], // Simplified for example
          getInteger: (name) => parseInt(args[1], 10),
          getUser: (name) => message.mentions.users.first(),
          getChannel: (name) => message.mentions.channels.first(),
          getSubcommand: () => args[0],
        }
      };

      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      message.reply('There was an error executing this command.');
    }
  } else {
    const now = Date.now();
    const User = require('./models/user');
    const GuildSettings = require('./models/guildSettings');
    let settings = await GuildSettings.findOne({ guildId: message.guild.id });

    if (!settings) {
      // Se as configurações não existirem, criamos um novo documento com valores padrão
      settings = new GuildSettings({ guildId: message.guild.id });
      await settings.save();
    }

    if (!settings.xpEnabled) return;
    if (settings.ignoreChannels.includes(message.channel.id)) return;
    if (message.member.roles.cache.some(role => settings.ignoreRoles.includes(role.id))) return;

    let user = await User.findOne({ userId: message.author.id, guildId: message.guild.id });
    if (!user) {
      user = new User({ userId: message.author.id, guildId: message.guild.id });
    }

    if (now - user.lastMessageTime < 60000) {
      return; // Verifica se passaram menos de 60 segundos desde a última mensagem
    }

    // Atualiza o lastMessageTime para o momento atual
    user.lastMessageTime = now;

    // Lógica para ganho de XP
    user.xp += 1; // Exemplo de ganho de 1 XP por mensagem
    const nextLevel = user.level * 100;
    if (user.xp >= nextLevel) {
      user.level += 1;
      const notifyMethod = settings.notifyMethod;
      const levelUpMessage = `Parabéns, ${message.author.username}! Você alcançou o nível ${user.level}!`;

      if (notifyMethod === 'default') {
        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('Nível Alcançado!')
          .setDescription(levelUpMessage);
        message.channel.send({ embeds: [embed] });
      } else if (notifyMethod === 'none') {
        // No notification
      } else if (notifyMethod === 'dm') {
        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('Nível Alcançado!')
          .setDescription(levelUpMessage);
        message.author.send({ embeds: [embed] }).catch(console.error);
      } else if (notifyMethod === 'channel') {
        const notifyChannel = message.guild.channels.cache.get(settings.notifyChannel);
        if (notifyChannel) {
          const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Nível Alcançado!')
            .setDescription(levelUpMessage);
          notifyChannel.send({ embeds: [embed] });
        }
      }

      for (const [roleId, xp] of settings.xpRoles.entries()) {
        if (user.xp >= xp) {
          if (!settings.stackRoles) {
            const rolesToRemove = settings.xpRoles.keys().filter(id => id !== roleId);
            message.member.roles.remove(rolesToRemove);
          }
          message.member.roles.add(roleId);
        }
      }
    }
    await user.save();
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'Houve um erro ao executar esse comando.', ephemeral: true });
  }
});

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Conectado ao MongoDB!');
  client.login(process.env.TOKEN);
}).catch(err => console.error('Erro ao conectar ao MongoDB:', err));