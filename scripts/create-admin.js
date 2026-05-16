/**
 * Run once to create an admin user:
 *   node scripts/create-admin.js
 *
 * The admin can also log in via /seller/login and will have
 * full access to all sellers' data.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));

(async () => {
  await mongoose.connect((process.env.MONGODB_URI || '').trim());

  const username    = await ask('Admin username: ');
  const email       = await ask('Admin email: ');
  const displayName = await ask('Display name: ');
  const password    = await ask('Admin password: ');
  rl.close();

  const existing = await User.findOne({ $or: [{ username }, { email }] });
  if (existing) {
    console.log('A user with that username or email already exists.');
    process.exit(0);
  }

  await User.create({ username, email, displayName, password, role: 'admin', active: true });
  console.log(`Admin user "${username}" created successfully.`);
  console.log('Login at /seller/login with your username and password.');
  process.exit(0);
})();
