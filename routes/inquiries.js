const express = require('express');
const router = express.Router();
const Inquiry = require('../models/Inquiry');
const Item = require('../models/Item');
const nodemailer = require('nodemailer');

router.post('/:itemId', async (req, res) => {
  const { name, email, phone, message } = req.body;
  const item = await Item.findById(req.params.itemId);
  if (!item) return res.redirect('/');

  try {
    await Inquiry.create({ item: item._id, itemTitle: item.title, name, email, phone, message });

    // Send notification email to the seller if SMTP is configured
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = await nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
      await transporter.sendMail({
        from: `"Home Items Shop" <${process.env.SMTP_USER}>`,
        to: process.env.SELLER_EMAIL || process.env.SMTP_USER,
        subject: `New inquiry for: ${item.title}`,
        html: `
          <h2>New buyer inquiry</h2>
          <p><strong>Item:</strong> ${item.title}</p>
          <p><strong>From:</strong> ${name} (${email}${phone ? ', ' + phone : ''})</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `
      });
    }

    res.render('inquiry-success', { title: 'Message Sent', item });
  } catch (err) {
    res.redirect(`/items/${item._id}?error=1`);
  }
});

module.exports = router;
