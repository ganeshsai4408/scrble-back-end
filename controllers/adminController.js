const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');

// @desc      Get admin dashboard stats
// @route     GET /api/admin/dashboard
// @access    Private (Admin only)
exports.getDashboardStats = async (req, res, next) => {
  try {
    // Aggregation for total revenue and orders
    const stats = await Order.aggregate([
      { $match: { isPaid: true } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalPrice' },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    // Aggregation for top 5 selling products
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      { $match: { isPaid: true } },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          totalQuantitySold: { $sum: '$items.quantity' },
        },
      },
      { $sort: { totalQuantitySold: -1 } },
      { $limit: 5 },
    ]);

    // Total counts for users and products
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        stats: stats[0] || { totalRevenue: 0, totalOrders: 0 },
        topProducts,
        totalUsers,
        totalProducts,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc      Get all users
// @route     GET /api/admin/users
// @access    Private (Admin only)
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort('-createdAt').select('-password');
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    next(err);
  }
};

// @desc      Get all orders
// @route     GET /api/admin/orders
// @access    Private (Admin only)
exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find().sort('-createdAt').populate('user', 'name email').populate('items.product', 'name');
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    next(err);
  }
};

// @desc      Update order status
// @route     PUT /api/admin/orders/:id/status
// @access    Private (Admin only)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, msg: 'Order not found' });
    }

    if (!['Processing', 'Shipped', 'Delivered', 'Cancelled'].includes(status)) {
      return res.status(400).json({ success: false, msg: 'Invalid status provided' });
    }

    order.orderStatus = status;
    await order.save();

    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};