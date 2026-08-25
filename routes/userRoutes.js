const express = require('express');
const router = express.Router();
const User = require('../models/userModel'); 
const { Resend } = require('resend');

// 1. Clé par défaut (pour les cas généraux si besoin)
const defaultResend = new Resend(process.env.RESEND_API_KEY);

// 2. Dictionnaire des clés API personnelles de chaque Administrateur
// Assure-toi de définir ces variables d'environnement sur Render !
const adminResendClients = {
  'blessingmingenge@gmail.com': new Resend(process.env.RESEND_API_KEY_BLESSING),
  'nathanmilungu@gmail.com': new Resend(process.env.RESEND_API_KEY_NATHAN),
  // Ajoute d'autres admins ici si nécessaire sous le même format :
  // 'autre_admin@gmail.com': new Resend(process.env.RESEND_API_KEY_AUTRE)
};

const otpStorage = {};

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

// Route : Envoyer un code OTP (Gère intelligemment les Admins et les Clients)
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
      // Si ce n'est pas un admin, on vérifie dans la collection des utilisateurs normaux
      const user = await User.findOne({ email: cleanEmail });
      if (!user) {
        return res.status(404).json({ message: "Cet email ne correspond à aucun compte enregistré." });
      }
      userName = user.name;
    }

    // Génération du code OTP
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    otpStorage[cleanEmail] = code;

    // Choix du client Resend (La clé perso de l'admin s'il s'agit d'un admin, sinon la clé par défaut)
    const activeResend = adminResendClient || defaultResend;

    await activeResend.emails.send({
      from: 'onboarding@resend.dev',
      to: cleanEmail,
      subject: 'Votre code de sécurité OTP - Mc Molato',
      text: `Bonjour ${userName},\n\nVoici votre code de vérification à usage unique : ${code}\n\nIl est valable pour vous connecter à votre espace Mc Molato.`
    });
    
    res.status(200).json({ success: true, message: "Code OTP envoyé avec succès par e-mail." });
  } catch (error) {
    console.error("Erreur Resend :", error);
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
      // Si c'est un admin, on renvoie un profil admin fictif ou validé
      if (adminResendClients[cleanEmail]) {
        return res.status(200).json({ 
          success: true, 
          message: "Code OTP valide (Admin).", 
          user: { name: "Administrateur", email: cleanEmail, phone: "" } 
        });
      }

      // Sinon, on récupère l'utilisateur normal depuis MongoDB
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