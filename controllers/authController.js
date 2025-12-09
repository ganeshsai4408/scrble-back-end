const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

// Helper function to generate and send a verification token
const sendVerificationToken = async (user, res, message) => {
  // Generate a random 6-digit token
  const emailVerificationToken = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Set the token and expiry on the user
  user.emailVerificationToken = emailVerificationToken;
  user.emailVerificationExpire = Date.now() + 3600000; // 1 hour

  await user.save({ validateBeforeSave: false });

  // Skip email sending if email env vars not configured (development mode)
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`📧 Email verification token for ${user.email}: ${emailVerificationToken}`);
    return res.status(200).json({ 
      success: true, 
      data: message,
      token: emailVerificationToken // Include token in response for development
    });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail', // Or use your SMTP provider
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
    to: user.email,
    subject: 'Email Verification for E-commerce Platform',
    html: `
      <h1>Hello ${user.name},</h1>
      <p>Thank you for registering. Please use the following token to verify your email address:</p>
      <h2 style="color: #007bff;">${emailVerificationToken}</h2>
      <p>This token is valid for one hour.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, data: message });
  } catch (err) {
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(500).json({ success: false, error: 'Email could not be sent' });
  }
};

// @desc      Register user
// @route     POST /api/auth/register
// @access    Public
exports.register = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { name, email, password, phoneNumber } = req.body;

  try {
    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({ success: false, msg: 'User already exists' });
    }

    user = await User.create({
      name,
      email,
      password,
      phoneNumber,
      isVerified: true, // Skip email verification for registration
    });

    // Send success response without email verification
    res.status(201).json({ 
      success: true, 
      message: 'User registered successfully. You can now log in.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role
        }
      }
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// @desc      Verify user email
// @route     POST /api/auth/verify-email
// @access    Public
exports.verifyEmail = async (req, res, next) => {
  const { email, token } = req.body;
  try {
    const user = await User.findOne({
      email,
      emailVerificationToken: token,
      emailVerificationExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, msg: 'Invalid or expired token' });
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });

    // Send JWT token after successful verification
    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// @desc      Login user
// @route     POST /api/auth/login
// @access    Public
exports.login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Check if user exists and fetch password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, msg: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, msg: 'Invalid credentials' });
    }

    // Skip email verification check - allow login immediately after registration
    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// @desc      Login with Google
// @route     POST /api/auth/google
// @access    Public
exports.googleLogin = async (req, res, next) => {
  const { token } = req.body;
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { name, email, sub } = ticket.getPayload(); // 'sub' is the Google user ID

    let user = await User.findOne({ email });

    if (!user) {
      // Create new user if they don't exist
      user = await User.create({
        name,
        email,
        password: sub, // Use Google ID as a placeholder password
        isVerified: true, // Google accounts are implicitly verified
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(401).json({ success: false, msg: 'Google login failed' });
  }
};

// @desc      Forgot password
// @route     POST /api/auth/forgot-password
// @access    Public
exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  
  // Check required environment variables
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(500).json({ 
      success: false, 
      error: 'Email service not configured properly' 
    });
  }
  
  let user;
  try {
    user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, msg: 'There is no user with that email' });
    }

    // Generate a reset token (reusing emailVerificationToken field for simplicity)
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 3600000; // 1 hour
    await user.save({ validateBeforeSave: false });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: user.email,
      subject: 'Password Reset Token',
      html: `
        <h1>Password Reset for E-commerce Platform</h1>
        <p>You are receiving this because you have requested the reset of the password for your account.</p>
        <p>Please use the following token to reset your password:</p>
        <h2 style="color: #ff0000;">${resetToken}</h2>
        <p>This token is valid for one hour.</p>
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, data: 'Password reset token sent to email' });

  } catch (err) {
    console.error('Forgot password error:', err);
    if (user) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
    }
    res.status(500).json({ success: false, error: 'Email could not be sent', details: err.message });
  }
};

// @desc      Verify reset password token
// @route     POST /api/auth/verify-reset-token
// @access    Public
exports.verifyResetToken = async (req, res, next) => {
  const { email, token } = req.body;
  
  try {
    const user = await User.findOne({
      email,
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, msg: 'Invalid or expired token' });
    }

    res.status(200).json({ success: true, msg: 'Token is valid' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// @desc      Reset password
// @route     PUT /api/auth/reset-password
// @access    Public
exports.resetPassword = async (req, res, next) => {
  const { email, token, password } = req.body;
  
  try {
    const user = await User.findOne({
      email,
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, msg: 'Invalid or expired token' });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ success: true, msg: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const response = {
    success: true,
    token,
    role: user.role,
    isVerified: user.isVerified,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    }
  };

  // Add redirect URL for admin users
  if (user.role === 'admin') {
    response.redirectTo = '/admin';
  }

  res.status(statusCode).json(response);
};