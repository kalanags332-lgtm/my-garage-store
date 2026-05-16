const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const Inquiry = require('../models/Inquiry');
const User = require('../models/User');
const { requireSeller } = require('../middleware/auth');
const { upload, uploadToCloudinary, destroyCloudinaryImage } = require('../config/cloudinary');

// All seller routes require authentication
router.use(requireSeller);

// ─── Dashboard ────────────────────────────────────────────────────────────────

router.get('/dashboard', async (req, res) => {
  try {
    // Admins see all items/inquiries; sellers see only their own
    const filter = req.session.isAdmin ? {} : { seller: req.session.sellerId };

    const [items, inquiries, seller] = await Promise.all([
      Item.find(filter)
        .sort({ createdAt: -1 })
        .populate('seller', 'displayName storeName')
        .select('title price category condition images sold createdAt seller')
        .lean(),
      Inquiry.find(filter)
        .sort({ createdAt: -1 })
        .populate('seller', 'displayName')
        .lean(),
      User.findById(req.session.sellerId).select('displayName storeName email').lean()
    ]);

    const unreadCount = inquiries.filter(i => !i.read).length;
    res.render('seller/dashboard', {
      title: 'Seller Dashboard',
      items,
      inquiries,
      unreadCount,
      seller,
      isAdmin: req.session.isAdmin || false
    });
  } catch (err) {
    res.redirect('/seller/login');
  }
});

// ─── Items ────────────────────────────────────────────────────────────────────

router.get('/items/new', (req, res) => {
  const categories = Item.schema.path('category').enumValues;
  const conditions = Item.schema.path('condition').enumValues;
  res.render('seller/item-form', { title: 'Add Item', item: null, categories, conditions, error: null });
});

router.post('/items', upload.array('images', 6), async (req, res) => {
  const categories = Item.schema.path('category').enumValues;
  const conditions = Item.schema.path('condition').enumValues;
  try {
    const { title, description, price, category, condition } = req.body;
    const images = await Promise.all((req.files || []).map(f => uploadToCloudinary(f.buffer)));
    await Item.create({
      seller: req.session.sellerId,
      title,
      description,
      price: parseFloat(price),
      category,
      condition,
      images
    });
    res.redirect('/seller/dashboard');
  } catch (err) {
    res.render('seller/item-form', { title: 'Add Item', item: null, categories, conditions, error: err.message });
  }
});

router.get('/items/:id/edit', async (req, res) => {
  try {
    const query = req.session.isAdmin
      ? { _id: req.params.id }
      : { _id: req.params.id, seller: req.session.sellerId };
    const item = await Item.findOne(query).lean();
    if (!item) return res.redirect('/seller/dashboard');
    const categories = Item.schema.path('category').enumValues;
    const conditions = Item.schema.path('condition').enumValues;
    res.render('seller/item-form', { title: 'Edit Item', item, categories, conditions, error: null });
  } catch (err) {
    res.redirect('/seller/dashboard');
  }
});

router.post('/items/:id/edit', upload.array('images', 6), async (req, res) => {
  try {
    const query = req.session.isAdmin
      ? { _id: req.params.id }
      : { _id: req.params.id, seller: req.session.sellerId };
    const item = await Item.findOne(query);
    if (!item) return res.redirect('/seller/dashboard');

    const { title, description, price, category, condition, removeImages } = req.body;

    if (removeImages) {
      const toRemove = Array.isArray(removeImages) ? removeImages : [removeImages];
      await Promise.all(toRemove.map(url => destroyCloudinaryImage(url)));
      item.images = item.images.filter(img => !toRemove.includes(img));
    }

    if (req.files && req.files.length > 0) {
      const newUrls = await Promise.all(req.files.map(f => uploadToCloudinary(f.buffer)));
      item.images.push(...newUrls);
    }

    item.title       = title;
    item.description = description;
    item.price       = parseFloat(price);
    item.category    = category;
    item.condition   = condition;
    await item.save();

    res.redirect('/seller/dashboard');
  } catch (err) {
    res.redirect('/seller/dashboard');
  }
});

router.post('/items/:id/toggle-sold', async (req, res) => {
  try {
    const query = req.session.isAdmin
      ? { _id: req.params.id }
      : { _id: req.params.id, seller: req.session.sellerId };
    const item = await Item.findOne(query);
    if (item) { item.sold = !item.sold; await item.save(); }
  } catch (_) {}
  res.redirect('/seller/dashboard');
});

router.post('/items/:id/delete', async (req, res) => {
  try {
    const query = req.session.isAdmin
      ? { _id: req.params.id }
      : { _id: req.params.id, seller: req.session.sellerId };
    const item = await Item.findOne(query);
    if (item) {
      await Promise.all(item.images.map(url => destroyCloudinaryImage(url)));
      await item.deleteOne();
    }
  } catch (_) {}
  res.redirect('/seller/dashboard');
});

// ─── Inquiries ────────────────────────────────────────────────────────────────

router.post('/inquiries/:id/read', async (req, res) => {
  try {
    const query = req.session.isAdmin
      ? { _id: req.params.id }
      : { _id: req.params.id, seller: req.session.sellerId };
    await Inquiry.findOneAndUpdate(query, { read: true });
  } catch (_) {}
  res.redirect('/seller/dashboard');
});

router.post('/inquiries/:id/delete', async (req, res) => {
  try {
    const query = req.session.isAdmin
      ? { _id: req.params.id }
      : { _id: req.params.id, seller: req.session.sellerId };
    await Inquiry.findOneAndDelete(query);
  } catch (_) {}
  res.redirect('/seller/dashboard');
});

// ─── Profile ──────────────────────────────────────────────────────────────────

router.get('/profile', async (req, res) => {
  try {
    const seller = await User.findById(req.session.sellerId).select('-password').lean();
    if (!seller) return res.redirect('/seller/login');
    res.render('seller/profile', { title: 'My Profile', seller, error: null, success: null });
  } catch (err) {
    res.redirect('/seller/dashboard');
  }
});

router.post('/profile', async (req, res) => {
  try {
    const { displayName, storeName, email, currentPassword, newPassword, confirmPassword } = req.body;
    const seller = await User.findById(req.session.sellerId);
    if (!seller) return res.redirect('/seller/login');

    // Update basic info
    seller.displayName = displayName;
    seller.storeName   = storeName;
    seller.email       = email;

    // Handle password change
    if (newPassword) {
      if (!(await seller.comparePassword(currentPassword))) {
        const sellerData = await User.findById(req.session.sellerId).select('-password').lean();
        return res.render('seller/profile', {
          title: 'My Profile',
          seller: sellerData,
          error: 'Current password is incorrect.',
          success: null
        });
      }
      if (newPassword !== confirmPassword) {
        const sellerData = await User.findById(req.session.sellerId).select('-password').lean();
        return res.render('seller/profile', {
          title: 'My Profile',
          seller: sellerData,
          error: 'New passwords do not match.',
          success: null
        });
      }
      seller.password = newPassword;
    }

    await seller.save();
    req.session.sellerName = seller.displayName;

    const sellerData = await User.findById(req.session.sellerId).select('-password').lean();
    res.render('seller/profile', {
      title: 'My Profile',
      seller: sellerData,
      error: null,
      success: 'Profile updated successfully.'
    });
  } catch (err) {
    const sellerData = await User.findById(req.session.sellerId).select('-password').lean();
    res.render('seller/profile', {
      title: 'My Profile',
      seller: sellerData,
      error: err.message,
      success: null
    });
  }
});

// ─── Admin: Manage Sellers ───────────────────────────────────────────────────

router.get('/sellers', async (req, res) => {
  if (!req.session.isAdmin) return res.redirect('/seller/dashboard');
  try {
    const sellers = await User.find({ role: 'seller' }).select('-password').sort({ createdAt: -1 }).lean();
    res.render('seller/sellers-list', { title: 'Manage Sellers', sellers });
  } catch (err) {
    res.redirect('/seller/dashboard');
  }
});

router.post('/sellers/:id/toggle-active', async (req, res) => {
  if (!req.session.isAdmin) return res.redirect('/seller/dashboard');
  try {
    const seller = await User.findById(req.params.id);
    if (seller) { seller.active = !seller.active; await seller.save(); }
  } catch (_) {}
  res.redirect('/seller/sellers');
});

router.post('/sellers/:id/delete', async (req, res) => {
  if (!req.session.isAdmin) return res.redirect('/seller/dashboard');
  try {
    const seller = await User.findById(req.params.id);
    if (seller) {
      // Remove seller's items
      const items = await Item.find({ seller: seller._id });
      for (const item of items) {
        await Promise.all(item.images.map(url => destroyCloudinaryImage(url)));
        await item.deleteOne();
      }
      await Inquiry.deleteMany({ seller: seller._id });
      await seller.deleteOne();
    }
  } catch (_) {}
  res.redirect('/seller/sellers');
});

module.exports = router;
