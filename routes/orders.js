const express = require('express');
const { body } = require('express-validator');
const {
  createOrder,
  verifyPayment,
  getOrderHistory,
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

const router = express.Router();

const checkoutValidation = [
  body('shippingAddress.address').not().isEmpty().trim().escape().withMessage('Address is required'),
  body('shippingAddress.city').not().isEmpty().trim().escape().withMessage('City is required'),
  body('shippingAddress.postalCode').not().isEmpty().trim().escape().withMessage('Postal code is required'),
  body('shippingAddress.country').not().isEmpty().trim().escape().withMessage('Country is required'),
];

router.post('/checkout', protect, checkoutValidation, createOrder);
router.post('/payment/verify', verifyPayment); // This can be public as the signature is validated
router.get('/', protect, getOrderHistory);

module.exports = router;