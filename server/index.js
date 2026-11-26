require('dotenv').config();
const express = require('express'), cors = require('cors'), jwt = require('jsonwebtoken'), bcrypt = require('bcryptjs'), multer = require('multer'), path = require('path'), fs = require('fs');
const mongoose = require('mongoose'), connect = require('./db'), { Notice, Admin, Log } = require('./models');
const SECRET = process.env.JWT_SECRET || 'dev_secret';
const app = express(); app.use(cors(), express.json());
const UP = path.join(__dirname, 'uploads'); fs.mkdirSync(UP, { recursive: true });
app.use('/uploads', express.static(UP));
const upload = multer({
  storage: multer.diskStorage({ destination: UP, filename: (r, f, cb) => cb(null, Date.now() + path.extname(f.originalname).toLowerCase()) }),
  limits: { fileSize: 3e6 }, fileFilter: (r, f, cb) => cb(null, /^image\/(png|jpe?g|gif|webp)$/.test(f.mimetype))
});
const CATS = ['Events', 'Sports', 'Academic', 'Examination', 'Important Announcements', 'General Notices'];
// Status is computed on every request, so scheduled/expired notices are managed automatically.
const status = n => { const t = Date.now(); if (!n.published) return 'draft'; if (new Date(n.publishDate) > t) return 'scheduled'; if (n.expiryDate && new Date(n.expiryDate) < t) return 'expired'; return 'active'; };
const view = n => ({ ...n, status: status(n) });
const wrap = fn => (q, s, n) => fn(q, s, n).catch(e => { console.error(e); s.status(500).json({ error: 'Server error' }); });
const log = async (u, a) => { await Log.create({ user: u, action: a }); const old = await Log.find().sort({ at: -1 }).skip(200).select('_id'); if (old.length) await Log.deleteMany({ _id: { $in: old.map(o => o._id) } }); };
const all = async () => (await Notice.find()).map(n => view(n.toJSON()));
const find = id => (mongoose.isValidObjectId(id) ? Notice.findById(id) : null);
const auth = (q, s, n) => { try { q.admin = jwt.verify((q.headers.authorization || '').slice(7), SECRET); n(); } catch { s.status(401).json({ error: 'Unauthorized' }); } };
const clean = b => {
  const e = [], t = String(b.title || '').trim(), ds = String(b.description || '').trim(), pd = new Date(b.publishDate), ed = b.expiryDate ? new Date(b.expiryDate) : null;
  if (t.length < 3 || t.length > 120) e.push('Title must be 3-120 characters');
  if (ds.length < 10) e.push('Description must be at least 10 characters');
  if (!CATS.includes(b.category)) e.push('Invalid category');
  if (!['Normal', 'High', 'Urgent'].includes(b.priority)) e.push('Invalid priority');
  if (isNaN(pd)) e.push('Invalid publication date');
  if (ed && (isNaN(ed) || ed <= pd)) e.push('Expiry date must be after publication date');
  const evd = b.eventDate ? new Date(b.eventDate) : null;
  return { e, v: { title: t, description: ds, category: b.category, priority: b.priority, publishDate: pd.toISOString(), expiryDate: ed ? ed.toISOString() : null, eventDate: evd && !isNaN(evd) ? evd.toISOString() : null, venue: String(b.venue || '').slice(0, 120), organizer: String(b.organizer || '').slice(0, 120) } };
};
const byDate = (a, b) => new Date(b.publishDate) - new Date(a.publishDate);

// ---------- Public ----------
app.get('/api/notices', wrap(async (q, s) => {
  const { search, category, sort } = q.query; let r = (await all()).filter(n => n.status === 'active');
  if (category && category !== 'All') r = r.filter(n => n.category === category);
  if (search) { const x = search.toLowerCase(); r = r.filter(n => (n.title + ' ' + n.description + ' ' + n.venue).toLowerCase().includes(x)); }
  r.sort((a, b) => sort === 'oldest' ? -byDate(a, b) : sort === 'title' ? a.title.localeCompare(b.title) : (!!b.pinned - !!a.pinned) || byDate(a, b));
  s.json(r);
}));
app.get('/api/notices/urgent', wrap(async (q, s) => s.json((await all()).filter(n => n.status === 'active' && (n.category === 'Important Announcements' || n.priority === 'Urgent')).sort(byDate))));
app.get('/api/notices/events', wrap(async (q, s) => s.json((await all()).filter(n => n.status === 'active' && n.category === 'Events' && n.eventDate && new Date(n.eventDate) >= Date.now()).sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate)))));
app.get('/api/notices/:id', wrap(async (q, s) => { const n = await find(q.params.id); n && status(n) === 'active' ? s.json(view(n.toJSON())) : s.status(404).json({ error: 'Not found' }); }));

// ---------- Auth ----------
const tries = {};
app.post('/api/auth/login', wrap(async (q, s) => {
  const k = q.ip; tries[k] = (tries[k] || []).filter(t => Date.now() - t < 6e4);
  if (tries[k].length >= 10) return s.status(429).json({ error: 'Too many attempts, wait a minute' });
  const a = await Admin.findOne({ username: String(q.body.username || '') });
  if (!a || !bcrypt.compareSync(String(q.body.password || ''), a.hash)) { tries[k].push(Date.now()); return s.status(401).json({ error: 'Invalid username or password' }); }
  await log(a.username, 'Logged in');
  s.json({ token: jwt.sign({ u: a.username }, SECRET, { expiresIn: '8h' }), username: a.username });
}));

// ---------- Admin (JWT protected) ----------
app.get('/api/admin/notices', auth, wrap(async (q, s) => { let r = await all(); if (q.query.status) r = r.filter(n => n.status === q.query.status); s.json(r.sort(byDate)); }));
app.get('/api/admin/stats', auth, wrap(async (q, s) => { const r = await all(), c = x => r.filter(n => n.status === x).length; s.json({ total: r.length, active: c('active'), scheduled: c('scheduled'), expired: c('expired'), draft: c('draft'), pinned: r.filter(n => n.pinned).length }); }));
app.get('/api/admin/logs', auth, wrap(async (q, s) => s.json((await Log.find().sort({ at: -1 }).limit(200)).map(l => l.toJSON()))));
app.post('/api/admin/notices', auth, upload.single('poster'), wrap(async (q, s) => {
  const { e, v } = clean(q.body); if (e.length) return s.status(400).json({ errors: e });
  const n = await Notice.create({ ...v, poster: q.file ? '/uploads/' + q.file.filename : null, published: q.body.published !== 'false', pinned: false });
  await log(q.admin.u, `Created notice "${n.title}"`); s.status(201).json(view(n.toJSON()));
}));
app.put('/api/admin/notices/:id', auth, upload.single('poster'), wrap(async (q, s) => {
  const n = await find(q.params.id); if (!n) return s.status(404).json({ error: 'Not found' });
  const { e, v } = clean(q.body); if (e.length) return s.status(400).json({ errors: e });
  Object.assign(n, v); if (q.file) n.poster = '/uploads/' + q.file.filename; if (q.body.published) n.published = q.body.published !== 'false';
  await n.save(); await log(q.admin.u, `Updated notice "${n.title}"`); s.json(view(n.toJSON()));
}));
app.patch('/api/admin/notices/:id/:op(publish|pin)', auth, wrap(async (q, s) => {
  const n = await find(q.params.id); if (!n) return s.status(404).json({ error: 'Not found' });
  if (q.params.op === 'publish') n.published = !n.published; else n.pinned = !n.pinned;
  await n.save(); await log(q.admin.u, `${q.params.op === 'publish' ? (n.published ? 'Published' : 'Unpublished') : (n.pinned ? 'Pinned' : 'Unpinned')} "${n.title}"`); s.json(view(n.toJSON()));
}));
app.delete('/api/admin/notices/:id', auth, wrap(async (q, s) => {
  const n = await find(q.params.id); if (!n) return s.status(404).json({ error: 'Not found' });
  await n.deleteOne(); if (n.poster) fs.unlink(path.join(__dirname, n.poster), () => {});
  await log(q.admin.u, `Deleted notice "${n.title}"`); s.json({ ok: true });
}));
const PORT = process.env.PORT || 5000;
connect().then(() => app.listen(PORT, () => console.log('MongoDB connected. API running on http://localhost:' + PORT)))
  .catch(e => { console.error('\nCould not connect to MongoDB: ' + e.message + '\nStart MongoDB, or set MONGODB_URI in server/.env (see README).'); process.exit(1); });
