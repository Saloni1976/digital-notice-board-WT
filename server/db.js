// MongoDB connection (local MongoDB or MongoDB Atlas via MONGODB_URI in .env)
const mongoose = require('mongoose');
module.exports = () => mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/digital_notice_board', { serverSelectionTimeoutMS: 5000 });
