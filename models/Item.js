const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  category: {
    type: String,
    required: true,
    enum: ['Furniture', 'Electronics', 'Clothing', 'Kitchen', 'Books', 'Sports', 'Toys', 'Tools', 'Other']
  },
  condition: {
    type: String,
    required: true,
    enum: ['Like New', 'Good', 'Fair', 'For Parts']
  },
  images: [{ type: String }],
  sold: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Indexes for common query patterns
itemSchema.index({ createdAt: -1 });
itemSchema.index({ category: 1, createdAt: -1 });
itemSchema.index({ condition: 1, createdAt: -1 });
itemSchema.index({ sold: 1, createdAt: -1 });
itemSchema.index({ title: 'text' });

module.exports = mongoose.model('Item', itemSchema);
