const express = require('express');
const router = express.Router();
const User = require('../models/userModel'); 
const { Resend } = require('resend');

// 1. Clé par défaut (pour les cas généraux si besoin)
const defaultResend = new Resend(process.env.RESEND_API_KEY);

// 2. Dictionnaire des clés API personnelles de chaque Administrateur pour Mc Molato
const adminResendClients = {
  'blessingmingenge@gmail.com': new Resend(process.env.RESEND_API_KEY_BLESSING),
  'milungushekinah@gmail.com': new Resend(process.env.RESEND_API_KEY_SHEKINAH)
};

const otpStorage = {};

// Route d'inscription client
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

// Route de connexion standard client (par e-mail ou nom, sans OTP)
router.post('/login', async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ message: "Veuillez entrer votre e-mail ou votre nom." });
    }

    const cleanId = identifier.trim().toLowerCase();
    
    // Recherche par email ou par nom (insensible à la casse)
    const user = await User.findOne({
      $or: [
        { email: cleanId },
        { name: { $regex: new RegExp(`^${cleanId}$`, 'i') } }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: "Compte introuvable. Veuillez vous inscrire." });
    }

    res.status(200).json({ 
      success: true, 
      message: "Connexion réussie.", 
      user: { name: user.name, email: user.email, phone: user.phone } 
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur lors de la connexion." });
  }
});

// Route : Envoyer un code OTP (Réservé exclusivement aux Administrateurs et vérifications sécurisées)
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "L'adresse email est requise." });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    
    // Vérifions d'abord si c'est un Administrateur répertorié
    const adminResendClient = adminResendClients[cleanEmail];

    let userName = "Administrateur";

    if (!adminResendClient) {
      const user = await User.findOne({ email: cleanEmail });
      if (!user) {
        return res.status(404).json({ message: "Cet email ne correspond à aucun compte enregistré." });
      }
      userName = user.name;
    }

    // Génération du code OTP
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    otpStorage[cleanEmail] = code;

    // Choix du client Resend
    const activeResend = adminResendClient || defaultResend;

    await activeResend.emails.send({
      from: 'onboarding@resend.dev',
      to: cleanEmail,
      subject: 'Votre code de sécurité OTP - Mc Molato',
      text: `Bonjour ${userName},\n\nVoici votre code de vérification à usage unique : ${code}\n\nIl est valable pour vous connecter à votre espace Mc Molato.`
    });
    
    res.status(200).json({ success: true, message: "Code OTP envoyé avec succès par e-mail." });
  } catch (error) {
    console.error("Erreur Resend détaillée :", error);
    res.status(500).json({ message: "Erreur lors de l'envoi de l'e-mail de vérification." });
  }
});

// Route : Vérifier le code OTP saisi
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email et code OTP requis." });
  }

  const cleanEmail = email.trim().toLowerCase();

  if (otpStorage[cleanEmail] && otpStorage[cleanEmail] === otp.trim()) {
    delete otpStorage[cleanEmail];
    try {
      if (adminResendClients[cleanEmail]) {
        return res.status(200).json({ 
          success: true, 
          message: "Code OTP valide (Admin).", 
          user: { name: "Administrateur", email: cleanEmail, phone: "" } 
        });
      }

      const user = await User.findOne({ email: cleanEmail });
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

// Routes de favoris et panier
router.post('/get-favorites', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé." });
    res.status(200).json({ success: true, favorites: user.favorites || [] });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur." });
  }
});

router.post('/update-favorites', async (req, res) => {
  try {
    const { email, favorites } = req.body;
    const user = await User.findOneAndUpdate({ email }, { favorites }, { new: true });
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé." });
    res.status(200).json({ success: true, favorites: user.favorites });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur." });
  }
});

router.post('/get-cart', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé." });
    res.status(200).json({ success: true, cart: user.cart || [] });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur." });
  }
});

router.post('/update-cart', async (req, res) => {
  try {
    const { email, cart } = req.body;
    const user = await User.findOneAndUpdate({ email }, { cart }, { new: true });
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé." });
    res.status(200).json({ success: true, cart: user.cart });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;