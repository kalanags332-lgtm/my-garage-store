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

    await Inquiry.create({
      item:      item._id,
      seller:    item.seller._id,
      itemTitle: item.title,
      name,
      email,
      phone,
      message
    });

    // Send notification email to the item's seller if SMTP is configured
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const sellerEmail = item.seller.email || process.env.SMTP_USER;
      const transporter = nodemailer.createTransport({
        host:   process.env.SMTP_HOST || 'smtp.gmail.com',
        port:   parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
      await transporter.sendMail({
        from:    `"My Garage Store" <${process.env.SMTP_USER}>`,
        to:      sellerEmail,
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
      });
    }

    res.render('inquiry-success', { title: 'Message Sent', item });
  } catch (err) {
    res.redirect(`/items/${req.params.itemId}?error=1`);
  }
});

module.exports = router;
