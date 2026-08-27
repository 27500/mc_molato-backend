const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
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

// Route d'inscription client sécurisée par mot de passe
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Veuillez remplir tous les champs obligatoires." });
    }

    let user = await User.findOne({ email: email.trim().toLowerCase() });
    if (user) {
      return res.status(400).json({ message: "Cet utilisateur existe déjà." });
    }

    // Hachage sécurisé du mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ 
      name, 
      email: email.trim().toLowerCase(), 
      password: hashedPassword, 
      phone: phone || '', 
      favorites: [], 
      cart: [] 
    });

    await user.save();
    
    res.status(201).json({ 
      success: true,
      name: user.name, 
      email: user.email, 
      phone: user.phone 
    });
  } catch (error) {
    console.error("Erreur inscription:", error);
    res.status(500).json({ message: "Erreur serveur lors de l'inscription." });
  }
});

// Route de connexion sécurisée par E-mail et Mot de passe
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Veuillez entrer votre e-mail et votre mot de passe." });
    }

    const cleanEmail = email.trim().toLowerCase();
    
    // Recherche de l'utilisateur par email
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ message: "E-mail ou mot de passe incorrect." });
    }

    // Vérification du mot de passe haché
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "E-mail ou mot de passe incorrect." });
    }

    res.status(200).json({ 
      success: true, 
      message: "Connexion réussie.", 
      user: { name: user.name, email: user.email, phone: user.phone } 
    });
  } catch (error) {
    console.error("Erreur connexion:", error);
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