require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const expressLayouts = require('express-ejs-layouts');
const compression = require('compression');
const path = require('path');

const app = express();

// Connect to MongoDB
const uri = (process.env.MONGODB_URI || '').trim();
mongoose.connect(uri)
  .then(() => console.log('MongoDB connected'))
  .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });

// Gzip all responses
app.use(compression());

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files — cache for 7 days in production
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0
}));

// Session
app.use(session({
  secret: (process.env.SESSION_SECRET || '').trim(),
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: uri }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// Make session data available in all views
app.use((req, res, next) => {
  res.locals.isAdmin    = req.session.isAdmin    || false;
  res.locals.isSeller   = req.session.isSeller   || false;
  res.locals.sellerId   = req.session.sellerId   || null;
  res.locals.sellerName = req.session.sellerName || null;
  next();
});

// Routes
app.use('/',        require('./routes/public'));
app.use('/auth',    require('./routes/auth'));       // Legacy admin login (kept for backwards-compat)
app.use('/admin',   require('./routes/admin'));      // Legacy admin panel (kept for backwards-compat)
app.use('/seller',  require('./routes/seller-auth'));
app.use('/seller',  require('./routes/seller'));
app.use('/inquiries', require('./routes/inquiries'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
