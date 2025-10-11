const Product = require('../models/Product');
const { validationResult } = require('express-validator');

// @desc      Get all products
// @route     GET /api/products
// @access    Public
exports.getProducts = async (req, res, next) => {
  try {
    const reqQuery = { ...req.query };

    // Fields to exclude from the query
    const removeFields = ['select', 'sort', 'page', 'limit'];
    removeFields.forEach(param => delete reqQuery[param]);

    let queryStr = JSON.stringify(reqQuery);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    let query = Product.find(JSON.parse(queryStr));

    // Select Fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Product.countDocuments();

    query = query.skip(startIndex).limit(limit);

    const products = await query;

    // Pagination result
    const pagination = {};
    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }
    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      pagination,
      data: products,
    });
  } catch (err) {
    next(err);
  }
};

// @desc      Get single product
// @route     GET /api/products/:id
// @access    Public
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, msg: 'Product not found' });
    }

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

// @desc      Create a product
// @route     POST /api/products
// @access    Private (Admin only)
exports.createProduct = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    req.body.user = req.user.id; // Assign the product to the logged-in user (admin)
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

// @desc      Update a product
// @route     PUT /api/products/:id
// @access    Private (Admin only)
exports.updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, msg: 'Product not found' });
    }

    // Make sure user is the product owner (or is an admin)
    if (product.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, msg: `User ${req.user.id} is not authorized to update this product` });
    }
    
    // The `express-validator` middleware is already handling validation
    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

// @desc      Delete a product
// @route     DELETE /api/products/:id
// @access    Private (Admin only)
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, msg: 'Product not found' });
    }

    // Make sure user is the product owner (or is an admin)
    if (product.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, msg: `User ${req.user.id} is not authorized to delete this product` });
    }
    
    await product.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};