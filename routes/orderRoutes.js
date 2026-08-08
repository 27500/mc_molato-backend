const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// 1. ROUTE POST : Créer une nouvelle commande
router.post('/', async (req, res) => {
  try {
    const { user, orderItems, shippingAddress, paymentMethod, totalPrice } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: "Aucun article dans la commande" });
    }

    const order = new Order({
      user,
      orderItems,
      shippingAddress,
      paymentMethod,
      totalPrice
    });

    const createdOrder = await order.save();
    res.status(201).json(createdOrder);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création de la commande", error: error.message });
  }
});

// 2. ROUTE GET : Récupérer une commande par son ID
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    
    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ message: "Commande introuvable" });
    }
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

module.exports = router;