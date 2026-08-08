const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true, enum: ['homme', 'femme', 'unisexe'] },
  rawPrice: { type: Number, required: true, index: true }, // Pour les tris et filtres par prix
  priceFormatted: { type: String, required: true },         // Ex: "120.000 CDF"
  image: { type: String, required: true },
  images: [{ type: String }],
  description: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);