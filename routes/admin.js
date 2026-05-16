/**
 * Legacy /admin routes — redirect to the new unified /seller dashboard.
 * Kept so that any bookmarked /admin URLs continue to work.
 */
const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');

// Require admin session before redirecting
router.use(requireAdmin);

router.get('/', (req, res) => res.redirect('/seller/dashboard'));
router.get('/items/new', (req, res) => res.redirect('/seller/items/new'));
router.get('/items/:id/edit', (req, res) => res.redirect(`/seller/items/${req.params.id}/edit`));

module.exports = router;
