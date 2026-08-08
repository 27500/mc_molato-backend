// models/userModel.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  favorites: { type: Array, default: [] } // 👈 Stocke les produits favoris
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);