const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  googleLogin,
  verifyEmail,
  forgotPassword,
  verifyResetToken,
  resetPassword,
} = require('../controllers/authController');

const router = express.Router();

// Validation for registration
const registerValidation = [
  body('name').not().isEmpty().trim().escape().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('phoneNumber').optional().isMobilePhone('any').withMessage('Please enter a valid phone number'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

// Validation for login
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').not().isEmpty().withMessage('Password is required'),
];

router.post('/register', registerValidation, register);
router.post('/verify-email', verifyEmail);
router.post('/login', loginValidation, login);
router.post('/google', googleLogin);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-token', verifyResetToken);
router.put('/reset-password', resetPassword);

module.exports = router;