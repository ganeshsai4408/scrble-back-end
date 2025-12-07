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

const allowedOrigins = [
  'http://localhost:5173', 
  'http://127.0.0.1:5173',
  'https://scrble-front-end.vercel.app' // Production frontend
]; 

console.log('🔓 CORS allowed origins:', allowedOrigins);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'CORS policy does not allow access from this Origin.';
            console.error(`❌ CORS Error: Origin '${origin}' not allowed`);
            return callback(new Error(msg), false);
        }
        console.log(`✅ CORS: Allowing origin '${origin}'`);
        return callback(null, true);
    },
    credentials: true
}));
app.use(helmet());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));

// Error handler middleware (must be after routes)
app.use(errorHandler);
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per IP per window
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api/', limiter); // Apply to all API routes

// Basic route for testing server status
app.get('/', (req, res) => {
  res.send('✅ API is running...');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: '✅ Backend is running and healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Define a placeholder for routes
// app.use('/api/auth', require('./routes/auth'));

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: ${process.env.NODE_ENV === 'production' ? 'https://scrble-back-end.onrender.com' : `http://localhost:${PORT}`}`);
});