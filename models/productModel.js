const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  priceFormatted: { type: String, required: true },
  rawPrice: { type: Number, required: true },
  category: { type: String, required: true },
  description: { type: String, default: 'Aucune description détaillée fournie.' },
  image: { type: String, required: true }, // URL ou lien de l'image principale
  images: { type: [String], default: [] }  // Galerie d'images
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);