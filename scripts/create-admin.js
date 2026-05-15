/**
 * Run once to create the admin user:
 *   node scripts/create-admin.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const username = await ask('Admin username: ');
  const password = await ask('Admin password: ');
  rl.close();

  const existing = await User.findOne({ username });
  if (existing) {
    console.log('User already exists. Delete it from MongoDB first to reset.');
    process.exit(0);
  }

  await User.create({ username, password });
  console.log(`Admin user "${username}" created successfully.`);
  process.exit(0);
})();
