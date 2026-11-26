const mongoose = require('mongoose'), { Schema, model } = mongoose;
// toJSON exposes `id` instead of `_id`, so API responses stay exactly as before.
const toJSON = { versionKey: false, transform: (doc, r) => { r.id = String(r._id); delete r._id; } };
const Notice = model('Notice', new Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 }, description: { type: String, required: true },
  category: String, priority: String, publishDate: { type: Date, required: true }, expiryDate: { type: Date, default: null }, eventDate: { type: Date, default: null },
  venue: { type: String, default: '' }, organizer: { type: String, default: '' }, poster: { type: String, default: null },
  published: { type: Boolean, default: true }, pinned: { type: Boolean, default: false }
}, { timestamps: { createdAt: 'createdAt', updatedAt: false }, toJSON }));
const Admin = model('Admin', new Schema({ username: { type: String, required: true, unique: true }, hash: { type: String, required: true } }, { toJSON }));
const Log = model('Log', new Schema({ user: String, action: String, at: { type: Date, default: Date.now } }, { toJSON }));
module.exports = { Notice, Admin, Log };
