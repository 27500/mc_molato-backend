const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const multer = require('multer');
const path = require('path');

// Configuration du stockage des images avec Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Dossier où seront stockées les images (assurez-vous que le dossier "uploads" existe à la racine du backend)
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Nom unique pour éviter les conflits (ex: timestamp + nom d'origine)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// 1. ROUTE GET : Récupérer tous les produits de la base de données
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// 2. ROUTE POST : Ajouter un nouveau vêtement avec une image de l'appareil (via upload.single('image'))
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, category, rawPrice, priceFormatted, description } = req.body;

    // Si un fichier a été uploadé, on construit l'URL d'accès, sinon on met une chaîne vide ou par défaut
    let imagePath = '';
    if (req.file) {
      // Ex: http://localhost:5000/uploads/1719678900000-123456789.jpg
      imagePath = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    const newProduct = new Product({
      name,
      category,
      rawPrice,
      priceFormatted,
      image: imagePath,
      description
    });

    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ message: "Erreur lors de l'ajout", error: error.message });
  }
});

module.exports = router;