const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Payment = require('../models/Payment');
const instance = require('../config/razorpay');
const crypto = require('crypto');

// Initialize Razorpay client


// @desc      Create a Razorpay order from cart
// @route     POST /api/orders/checkout
// @access    Private
exports.createOrder = async (req, res, next) => {
  try {
    const { shippingAddress } = req.body;

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, msg: 'Cart is empty' });
    }

    const totalAmount = cart.items.reduce((acc, item) => acc + item.price * item.quantity, 0);

    const options = {
      amount: totalAmount * 100, // Amount in the smallest currency unit (paise)
      currency: "INR",
      receipt: `order_rcptid_${Date.now()}`,
    };

    const razorpayOrder = await instance.orders.create(options);
    
    // Create a new order and payment record in DB
    const order = new Order({
      user: req.user.id,
      items: cart.items.map(item => ({
        product: item.product,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      shippingAddress,
      totalPrice: totalAmount,
      isPaid: false,
      paymentMethod: 'Razorpay',
    });

    const payment = new Payment({
      user: req.user.id,
      order: order._id,
      razorpay_order_id: razorpayOrder.id,
      amount: totalAmount,
      status: 'pending',
    });

    order.payment = payment._id;

    await order.save();
    await payment.save();

    res.status(200).json({
      success: true,
      data: {
        id: razorpayOrder.id,
        currency: razorpayOrder.currency,
        amount: razorpayOrder.amount,
      },
    });

  } catch (err) {
    next(err);
  }
};

// @desc      Verify Razorpay payment and update order status
// @route     POST /api/orders/payment/verify
// @access    Public (handled internally by Razorpay webhook)
exports.verifyPayment = async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  try {
    // Generate HMAC SHA256 signature
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest === razorpay_signature) {
      // Find the payment record in your DB
      const payment = await Payment.findOneAndUpdate(
        { razorpay_order_id },
        { razorpay_payment_id, razorpay_signature, status: 'completed' },
        { new: true }
      );

      if (!payment) {
        return res.status(404).json({ success: false, msg: 'Payment record not found' });
      }

      // Update the corresponding order
      const order = await Order.findByIdAndUpdate(
        payment.order,
        { isPaid: true, paidAt: Date.now(), orderStatus: 'Processing' },
        { new: true }
      );

      // Clear the user's cart
      await Cart.findOneAndDelete({ user: req.user.id });

      res.status(200).json({ success: true, msg: 'Payment successful and order updated' });
    } else {
      res.status(400).json({ success: false, msg: 'Invalid signature' });
    }
  } catch (err) {
    next(err);
  }
};

// @desc      Get a user's order history
// @route     GET /api/orders
// @access    Private
exports.getOrderHistory = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort('-createdAt').populate('items.product', 'name images');
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    next(err);
  }
};