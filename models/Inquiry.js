const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
  item:      { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  seller:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itemTitle: { type: String, required: true },
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, trim: true },
  phone:     { type: String, trim: true },
  message:   { type: String, required: true },
  read:      { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

inquirySchema.index({ seller: 1, createdAt: -1 });
inquirySchema.index({ createdAt: -1 });
inquirySchema.index({ read: 1, createdAt: -1 });

module.exports = mongoose.model('Inquiry', inquirySchema);
