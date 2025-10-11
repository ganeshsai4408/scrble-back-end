const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a product name'],
    trim: true,
    maxlength: [100, 'Name can not be more than 100 characters'],
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [500, 'Description can not be more than 500 characters'],
  },
  price: {
    type: Number,
    required: [true, 'Please add a price'],
  },
  images: [{
    type: String, // Store image URLs
    required: true,
  }],
  category: {
    type: String,
    required: [true, 'Please specify a category'],
    enum: ['Electronics', 'Books', 'Clothing', 'Home', 'Health'],
  },
  stock: {
    type: Number,
    required: [true, 'Please add the stock quantity'],
    min: [0, 'Stock cannot be negative'],
  },
  rating: {
    type: Number,
    default: 0,
  },
  numOfReviews: {
    type: Number,
    default: 0,
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Product', ProductSchema);