const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const Inquiry = require('../models/Inquiry');
const { requireAdmin } = require('../middleware/auth');
const { upload, uploadToCloudinary, destroyCloudinaryImage } = require('../config/cloudinary');

router.use(requireAdmin);

// Dashboard
router.get('/', async (req, res) => {
  const [items, inquiries] = await Promise.all([
    Item.find().sort({ createdAt: -1 })
      .select('title price category condition images sold createdAt')
      .lean(),
    Inquiry.find().sort({ createdAt: -1 }).lean()
  ]);
  const unreadCount = inquiries.filter(i => !i.read).length;
  res.render('admin/dashboard', { title: 'Admin Dashboard', items, inquiries, unreadCount });
});

// New item form
router.get('/items/new', (req, res) => {
  const categories = Item.schema.path('category').enumValues;
  const conditions = Item.schema.path('condition').enumValues;
  res.render('admin/item-form', { title: 'Add Item', item: null, categories, conditions, error: null });
});

// Create item
router.post('/items', upload.array('images', 6), async (req, res) => {
  const categories = Item.schema.path('category').enumValues;
  const conditions = Item.schema.path('condition').enumValues;
  try {
    const { title, description, price, category, condition } = req.body;
    const images = await Promise.all((req.files || []).map(f => uploadToCloudinary(f.buffer)));
    await Item.create({ title, description, price: parseFloat(price), category, condition, images });
    res.redirect('/admin');
  } catch (err) {
    res.render('admin/item-form', { title: 'Add Item', item: null, categories, conditions, error: err.message });
  }
});

// Edit item form
router.get('/items/:id/edit', async (req, res) => {
  const item = await Item.findById(req.params.id).lean();
  if (!item) return res.redirect('/admin');
  const categories = Item.schema.path('category').enumValues;
  const conditions = Item.schema.path('condition').enumValues;
  res.render('admin/item-form', { title: 'Edit Item', item, categories, conditions, error: null });
});

// Update item
router.post('/items/:id/edit', upload.array('images', 6), async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.redirect('/admin');

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

    item.title = title;
    item.description = description;
    item.price = parseFloat(price);
    item.category = category;
    item.condition = condition;
    await item.save();

    res.redirect('/admin');
  } catch (err) {
    res.redirect('/admin');
  }
});

// Toggle sold status
router.post('/items/:id/toggle-sold', async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (item) { item.sold = !item.sold; await item.save(); }
  res.redirect('/admin');
});

// Delete item
router.post('/items/:id/delete', async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (item) {
    await Promise.all(item.images.map(url => destroyCloudinaryImage(url)));
    await item.deleteOne();
  }
  res.redirect('/admin');
});

// Mark inquiry as read
router.post('/inquiries/:id/read', async (req, res) => {
  await Inquiry.findByIdAndUpdate(req.params.id, { read: true });
  res.redirect('/admin');
});

// Delete inquiry
router.post('/inquiries/:id/delete', async (req, res) => {
  await Inquiry.findByIdAndDelete(req.params.id);
  res.redirect('/admin');
});

module.exports = router;
