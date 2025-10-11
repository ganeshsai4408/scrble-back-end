const express = require('express');
const { body } = require('express-validator');
const {
  getDashboardStats,
  getUsers,
  getOrders,
  updateOrderStatus,
} = require('../controllers/adminController');

const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

const router = express.Router();

// All routes in this router will be protected and for admins only
router.use(protect, admin);

router.get('/dashboard', getDashboardStats);
router.get('/users', getUsers);
router.get('/orders', getOrders);
router.put('/orders/:id/status', [
  body('status').not().isEmpty().withMessage('Status is required'),
], updateOrderStatus);

module.exports = router;