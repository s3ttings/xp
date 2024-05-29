const mongoose = require('mongoose');

const guildSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  xpEnabled: { type: Boolean, default: true },
  stackRoles: { type: Boolean, default: true },
  notifyMethod: { type: String, default: 'default' },
  xpRoles: { type: Map, of: Number }, // Map of roleId to required XP
  ignoreRoles: { type: [String], default: [] },
  ignoreChannels: { type: [String], default: [] },
  voiceXPCooldown: { type: Number, default: 60 }, // Cooldown in minutes
  voiceXPEnabled: { type: Boolean, default: true },
  voiceIgnoreChannels: { type: [String], default: [] },
});

module.exports = mongoose.model('GuildSettings', guildSettingsSchema);