const express = require('express');
const router = express.Router();
const Inquiry = require('../models/Inquiry');
const Item = require('../models/Item');
const User = require('../models/User');
const nodemailer = require('nodemailer');

router.post('/:itemId', async (req, res) => {
  const { name, email, phone, message } = req.body;

  try {
    const item = await Item.findById(req.params.itemId).populate('seller', 'email displayName storeName');
    if (!item) return res.redirect('/');

    const sellerId = item.seller ? item.seller._id : null;

    // We can't create an inquiry if seller is absolutely required but missing.
    // Let's dynamically find an admin fallback if seller is null.
    let targetSellerId = sellerId;
    let sellerEmail = null;
    
    if (!targetSellerId) {
      const admin = await User.findOne({ role: 'admin' });
      targetSellerId = admin ? admin._id : null;
    } else {
      sellerEmail = item.seller.email;
    }

    if (!targetSellerId) {
      throw new Error("No seller or admin found to receive this inquiry.");
    }

    await Inquiry.create({
      item:      item._id,
      seller:    targetSellerId,
      itemTitle: item.title,
      name,
      email,
      phone,
      message
    });

    // Send notification email to the item's seller if SMTP is configured
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const targetEmail = sellerEmail || process.env.SMTP_USER;
      const transporter = nodemailer.createTransport({
        host:   process.env.SMTP_HOST || 'smtp.gmail.com',
        port:   parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
      transporter.sendMail({
        from:    `"My Garage Store" <${process.env.SMTP_USER}>`,
        to:      targetEmail,
        subject: `New inquiry for: ${item.title}`,
        html: `
          <h2>New buyer inquiry</h2>
          <p><strong>Item:</strong> ${item.title}</p>
          <p><strong>From:</strong> ${name} (${email}${phone ? ', ' + phone : ''})</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
          <hr/>
          <p><a href="${process.env.BASE_URL || 'http://localhost:3000'}/seller/dashboard">View in your dashboard</a></p>
        `
      }).catch(err => console.error('Email sending failed:', err));
    }

    res.render('inquiry-success', { title: 'Message Sent', item });
  } catch (err) {
    console.error('Inquiry submission error:', err);
    res.redirect(`/items/${req.params.itemId}?error=1`);
  }
});

module.exports = router;
