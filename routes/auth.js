const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/login', (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin');
  res.render('auth/login', { title: 'Admin Login', error: null });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password))) {
      return res.render('auth/login', { title: 'Admin Login', error: 'Invalid username or password.' });
    }
    req.session.isAdmin = true;
    req.session.adminUser = user.username;
    res.redirect('/admin');
  } catch (err) {
    res.render('auth/login', { title: 'Admin Login', error: 'Something went wrong. Try again.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
