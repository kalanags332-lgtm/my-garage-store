const express = require('express');
const router = express.Router();
const User = require('../models/User');

// ─── Register ────────────────────────────────────────────────────────────────

router.get('/register', (req, res) => {
  if (req.session.sellerId) return res.redirect('/seller/dashboard');
  res.render('seller/register', { title: 'Seller Registration', error: null, form: {} });
});

router.post('/register', async (req, res) => {
  const { username, email, displayName, storeName, password, confirmPassword } = req.body;
  const form = { username, email, displayName, storeName };

  if (password !== confirmPassword) {
    return res.render('seller/register', {
      title: 'Seller Registration',
      error: 'Passwords do not match.',
      form
    });
  }

  try {
    const seller = await User.create({ username, email, displayName, storeName, password, role: 'seller' });
    req.session.sellerId   = seller._id.toString();
    req.session.sellerName = seller.displayName;
    req.session.isSeller   = true;
    res.redirect('/seller/dashboard');
  } catch (err) {
    const message = err.code === 11000
      ? 'Username or email already registered.'
      : err.message;
    res.render('seller/register', { title: 'Seller Registration', error: message, form });
  }
});

// ─── Login ────────────────────────────────────────────────────────────────────

router.get('/login', (req, res) => {
  if (req.session.sellerId) return res.redirect('/seller/dashboard');
  res.render('seller/login', { title: 'Seller Login', error: null });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const seller = await User.findOne({ username, role: { $in: ['seller', 'admin'] } });
    if (!seller || !seller.active) {
      return res.render('seller/login', { title: 'Seller Login', error: 'Invalid credentials or account inactive.' });
    }
    if (!(await seller.comparePassword(password))) {
      return res.render('seller/login', { title: 'Seller Login', error: 'Invalid username or password.' });
    }
    req.session.sellerId   = seller._id.toString();
    req.session.sellerName = seller.displayName;
    req.session.isSeller   = true;
    // If the seller is also an admin, preserve the admin flag
    if (seller.role === 'admin') req.session.isAdmin = true;
    res.redirect('/seller/dashboard');
  } catch (err) {
    res.render('seller/login', { title: 'Seller Login', error: 'Something went wrong. Try again.' });
  }
});

// ─── Logout ───────────────────────────────────────────────────────────────────

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
