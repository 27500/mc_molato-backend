const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// 1. ROUTE GET : Récupérer tous les produits de la base de données
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// 2. ROUTE POST : Ajouter un nouveau vêtement en JSON (avec image Base64)
router.post('/', async (req, res) => {
  try {
    const { name, category, rawPrice, priceFormatted, image, images, description } = req.body;

    // Validation de base
    if (!name || !category || !rawPrice || !priceFormatted || !image) {
      return res.status(400).json({ message: "Veuillez remplir tous les champs obligatoires (nom, catégorie, prix, image)." });
    }

    const newProduct = new Product({
      name,
      category,
      rawPrice: Number(rawPrice),
      priceFormatted,
      image,
      images: images || [image],
      description: description || ''
    });

    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error("Erreur Mongoose :", error);
    res.status(400).json({ message: "Erreur lors de l'ajout", error: error.message });
  }
});

// 3. ROUTE DELETE : Supprimer un produit
router.delete('/:id', async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ message: "Produit introuvable" });
    }
    res.json({ message: "Produit supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression", error: error.message });
  }
});

module.exports = router;