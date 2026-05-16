require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Item = require('../models/Item');

mongoose.connect((process.env.MONGODB_URI || '').trim()).then(async () => {
  const admin = await User.findOne({ role: 'admin' }) || await User.findOne();
  if (!admin) {
    console.log('No user found! Please run node scripts/create-admin.js first.');
    process.exit(1);
  }
  const result = await Item.updateMany(
    { seller: { $exists: false } },
    { $set: { seller: admin._id } }
  );
  console.log('Updated items:', result.modifiedCount);
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
