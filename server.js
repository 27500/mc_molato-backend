const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rendre le dossier "uploads" accessible publiquement
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ENREGISTRER TOUTES LES ROUTES DE LA BOUTIQUE ET DE LA API
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));

// Route de test pour vérifier l'état du serveur
app.get('/', (req, res) => {
  res.send('API Mc Molato en marche...');
});

// LANCEMENT DU SERVEUR POUR RENDER ET LOCAL
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});