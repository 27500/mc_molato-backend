const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const Contact = require('./models/contactModel');

dotenv.config();
connectDB();

const app = express();

// Middlewares avec augmentation de la limite de taille pour les images Base64
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rendre le dossier "uploads" accessible publiquement
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ENREGISTRER TOUTES LES ROUTES DE LA BOUTIQUE ET DE LA API
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));

// Route pour enregistrer un message depuis la page Contact
app.post('/api/contact', async (req, res) => {
  try {
    const { name, prenom, nom, email, message } = req.body;
    if (!email || !message) {
      return res.status(400).json({ message: "L'email et le message sont requis." });
    }

    const newContact = new Contact({
      name: name || `${prenom || ''} ${nom || ''}`.trim(),
      prenom: prenom || '',
      nom: nom || '',
      email,
      message
    });

    await newContact.save();
    res.status(201).json({ success: true, message: "Message enregistré avec succès." });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement du contact:", error);
    res.status(500).json({ message: "Erreur serveur lors de l'enregistrement du message." });
  }
});

// Route pour que l'admin puisse récupérer tous les messages de contact
app.get('/api/contact/messages', async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error("Erreur lors de la récupération des messages:", error);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des messages." });
  }
});

app.get('/', (req, res) => {
  res.send('API Mc Molato en marche...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});