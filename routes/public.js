const express = require('express');
const router = express.Router();
const Item = require('../models/Item');

const PAGE_SIZE = 12;

// Transform a full Cloudinary URL into a resized thumbnail URL
function thumbUrl(url, width = 400) {
  if (!url || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/w_${width},f_auto,q_auto/`);
}

// Homepage — browse items with pagination
router.get('/', async (req, res) => {
  const { category, condition, q, page } = req.query;
  const currentPage = Math.max(1, parseInt(page) || 1);
  const filter = {};

  if (category) filter.category = category;
  if (condition) filter.condition = condition;
  if (q) filter.$text = { $search: q };

  const [items, total] = await Promise.all([
    Item.find(filter)
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .select('title price category condition images sold createdAt')
      .lean(),
    Item.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const categories = Item.schema.path('category').enumValues;
  const conditions = Item.schema.path('condition').enumValues;

  res.render('index', {
    title: 'Home Items For Sale',
    items,
    categories,
    conditions,
    query: req.query,
    thumbUrl,
    currentPage,
    totalPages
  });
});

// Item detail page
router.get('/items/:id', async (req, res) => {
  const item = await Item.findById(req.params.id).lean();
  if (!item) return res.status(404).render('404', { title: 'Not Found' });
  res.render('item', { title: item.title, item, query: req.query });
});

module.exports = router;
