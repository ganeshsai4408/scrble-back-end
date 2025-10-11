const Cart = require('../models/Cart');
const Product = require('../models/Product');

// @desc      Get user's cart
// @route     GET /api/cart
// @access    Private
exports.getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product', 'name price stock images');

    if (!cart) {
      return res.status(404).json({ success: false, msg: 'Cart not found for this user' });
    }

    res.status(200).json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
};

// @desc      Add item to cart or update quantity
// @route     POST /api/cart
// @access    Private
exports.addToCart = async (req, res, next) => {
  const { productId, quantity } = req.body;
  
  try {
    let cart = await Cart.findOne({ user: req.user.id });
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ success: false, msg: 'Product not found' });
    }

    // Check if product is in stock
    if (product.stock < quantity) {
      return res.status(400).json({ success: false, msg: `Only ${product.stock} units are available for this product` });
    }

    if (cart) {
      // Cart exists for user
      const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

      if (itemIndex > -1) {
        // Product exists in the cart, update quantity
        let item = cart.items[itemIndex];
        item.quantity += quantity;
        cart.items[itemIndex] = item;
      } else {
        // Product does not exist in cart, add new item
        cart.items.push({
          product: productId,
          name: product.name,
          price: product.price,
          image: product.images[0],
          quantity,
        });
      }
      await cart.save();
      res.status(200).json({ success: true, data: cart });
    } else {
      // No cart for user, create a new one
      const newCart = await Cart.create({
        user: req.user.id,
        items: [{
          product: productId,
          name: product.name,
          price: product.price,
          image: product.images[0],
          quantity,
        }],
      });
      res.status(201).json({ success: true, data: newCart });
    }
  } catch (err) {
    next(err);
  }
};

// @desc      Remove item from cart
// @route     DELETE /api/cart/:id
// @access    Private
exports.removeFromCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({ success: false, msg: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => item.product.toString() === req.params.id);

    if (itemIndex > -1) {
      cart.items.splice(itemIndex, 1);
      await cart.save();
      return res.status(200).json({ success: true, msg: 'Item removed from cart', data: cart });
    } else {
      return res.status(404).json({ success: false, msg: 'Item not found in cart' });
    }
  } catch (err) {
    next(err);
  }
};