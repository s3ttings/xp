const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  guildId: { type: String, required: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  lastMessageTime: { type: Date, default: Date.now } // Last Message Time
});

module.exports = mongoose.model('User', userSchema);
