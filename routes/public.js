const express = require('express');
const router = express.Router();
const Item = require('../models/Item');

// Homepage — browse all available items
router.get('/', async (req, res) => {
  const { category, condition, q } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (condition) filter.condition = condition;
  if (q) filter.title = { $regex: q, $options: 'i' };

  const items = await Item.find(filter).sort({ createdAt: -1 });
  const categories = Item.schema.path('category').enumValues;
  const conditions = Item.schema.path('condition').enumValues;

  res.render('index', { title: 'Home Items For Sale', items, categories, conditions, query: req.query });
});

// Item detail page
router.get('/items/:id', async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).render('404', { title: 'Not Found' });
  res.render('item', { title: item.title, item });
});

module.exports = router;
