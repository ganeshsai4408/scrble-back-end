require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');

// Import DB connection function
const connectDB = require('./config/db');

// Connect to the database
connectDB();

const app = express();

// Set up security middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(errorHandler);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per IP per window
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api/', limiter); // Apply to all API routes

// Basic route for testing server status
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Define a placeholder for routes
// app.use('/api/auth', require('./routes/auth'));

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));