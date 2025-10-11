const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  items: [{
    product: {
      type: mongoose.Schema.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: String,
    price: Number,
    image: String, // Storing a single image URL for simplicity
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
  }],
});

module.exports = mongoose.model('Cart', CartSchema);