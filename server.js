const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

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

app.get('/', (req, res) => {
  res.send('API Mc Molato en marche...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});