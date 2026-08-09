const mongoose = require('mongoose');

let isConnected = false; // Variable pour suivre l'état de la connexion

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 5000, // Évite de bloquer trop longtemps si MongoDB met du temps à répondre
    });

    isConnected = conn.connections[0].readyState === 1;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Erreur de connexion MongoDB : ${error.message}`);
    throw error; // Laisse l'erreur remonter pour qu'elle soit visible dans les logs si besoin
  }
};

module.exports = connectDB;