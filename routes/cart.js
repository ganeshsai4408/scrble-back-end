const express = require('express');
const { body } = require('express-validator');
const {
  getCart,
  addToCart,
  removeFromCart,
} = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

const router = express.Router();

const cartValidation = [
  body('productId').isMongoId().withMessage('Invalid product ID'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
];

router.route('/')
  .get(protect, getCart)
  .post(protect, cartValidation, addToCart);

router.route('/:id')
  .delete(protect, removeFromCart);

module.exports = router;