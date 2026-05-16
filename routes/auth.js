const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Legacy admin login — redirect to unified seller login portal
router.get('/login', (req, res) => {
  res.redirect('/seller/login');
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username, role: 'admin' });
    if (!user || !(await user.comparePassword(password))) {
      return res.render('auth/login', { title: 'Admin Login', error: 'Invalid username or password.' });
    }
    req.session.isAdmin    = true;
    req.session.isSeller   = true;
    req.session.sellerId   = user._id.toString();
    req.session.sellerName = user.displayName || user.username;
    res.redirect('/seller/dashboard');
  } catch (err) {
    res.render('auth/login', { title: 'Admin Login', error: 'Something went wrong. Try again.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
