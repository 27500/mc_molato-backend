// models/userModel.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // 👈 Ajout du mot de passe haché
  phone: { type: String },
  favorites: { type: Array, default: [] },
  cart: { type: Array, default: [] } // J'en profite aussi pour ajouter le panier si ce n'était pas déjà fait
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);