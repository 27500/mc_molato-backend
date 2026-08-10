const express = require('express');
const router = express.Router();
const User = require('../models/userModel'); 
const nodemailer = require('nodemailer');

const otpStorage = {};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  family: 4, // <-- Ajouté pour résoudre le timeout réseau et le blocage IPv6 sur Render
  auth: {
    user: process.env.EMAIL_USER || 'blessingmingenge@gmail.com',
    pass: process.env.EMAIL_PASS || 'pxuw mvfd uyht xrci'
  }
});

// Route d'inscription
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "Cet utilisateur existe déjà." });
    }
    user = new User({ name, email, phone, favorites: [], cart: [] });
    await user.save();
    res.status(201).json({ name: user.name, email: user.email, phone: user.phone });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur lors de l'inscription." });
  }
});

// Route de connexion standard
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Compte introuvable." });
    }
    res.status(200).json({ message: "Utilisateur trouvé." });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// Route : Envoyer un vrai code OTP par e-mail
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "L'adresse email est requise." });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Cet email ne correspond à aucun compte enregistré." });
    }

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    otpStorage[email] = code;

    const mailOptions = {
      from: '"Mc Molato" <' + (process.env.EMAIL_USER || 'blessingmingenge@gmail.com') + '>',
      to: email,
      subject: 'Votre code de sécurité OTP - Mc Molato',
      text: `Bonjour ${user.name},\n\nVoici votre code de vérification à usage unique : ${code}\n\nIl est valable pour vous connecter à votre espace Mc Molato.`
    };

    await transporter.sendMail(mailOptions);
    
    res.status(200).json({ success: true, message: "Code OTP envoyé avec succès par e-mail." });
  } catch (error) {
    console.error("Erreur Nodemailer :", error);
    res.status(500).json({ message: "Erreur lors de l'envoi de l'e-mail de vérification." });
  }
});

// Route : Vérifier le code OTP saisi (Renvoie les infos de l'utilisateur pour le stockage local)
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email et code OTP requis." });
  }

  if (otpStorage[email] && otpStorage[email] === otp.trim()) {
    delete otpStorage[email];
    try {
      const user = await User.findOne({ email });
      return res.status(200).json({ 
        success: true, 
        message: "Code OTP valide.", 
        user: { name: user.name, email: user.email, phone: user.phone } 
      });
    } catch (err) {
      return res.status(500).json({ message: "Erreur lors de la récupération de l'utilisateur." });
    }
  }

  return res.status(400).json({ success: false, message: "Code OTP incorrect ou expiré." });
});

// Récupérer les favoris d'un utilisateur
router.post('/get-favorites', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }
    res.status(200).json({ success: true, favorites: user.favorites || [] });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur lors de la récupération des favoris." });
  }
});

// Mettre à jour les favoris en base de données
router.post('/update-favorites', async (req, res) => {
  try {
    const { email, favorites } = req.body;
    const user = await User.findOneAndUpdate(
      { email },
      { favorites },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }
    res.status(200).json({ success: true, favorites: user.favorites });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur lors de la mise à jour des favoris." });
  }
});

// Récupérer le panier d'un utilisateur en base de données
router.post('/get-cart', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }
    res.status(200).json({ success: true, cart: user.cart || [] });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur lors de la récupération du panier." });
  }
});

// Mettre à jour le panier en base de données
router.post('/update-cart', async (req, res) => {
  try {
    const { email, cart } = req.body;
    const user = await User.findOneAndUpdate(
      { email },
      { cart },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }
    res.status(200).json({ success: true, cart: user.cart });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur lors de la mise à jour du panier." });
  }
});

module.exports = router;