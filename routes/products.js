const express = require('express');
const { body } = require('express-validator');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

const router = express.Router();

const productValidation = [
  body('name').not().isEmpty().trim().escape().withMessage('Name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('images').isArray({ min: 1 }).withMessage('At least one image URL is required'),
  body('category').isIn(['Electronics', 'Books', 'Clothing', 'Home', 'Health']).withMessage('Invalid category'),
];

router.route('/')
  .get(getProducts)
  .post(protect, admin, productValidation, createProduct);

router.route('/:id')
  .get(getProduct)
  .put(protect, admin, productValidation, updateProduct)
  .delete(protect, admin, deleteProduct);

module.exports = router;