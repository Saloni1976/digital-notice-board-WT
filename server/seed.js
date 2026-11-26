require('dotenv').config();
const bcrypt = require('bcryptjs'), mongoose = require('mongoose'), connect = require('./db'), { Notice, Admin } = require('./models');
(async () => {
  await connect();
  const u = process.env.ADMIN_USERNAME || 'admin';
  await Admin.findOneAndUpdate({ username: u }, { hash: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin@123', 10) }, { upsert: true });
  if (!(await Notice.countDocuments())) {
    const day = n => new Date(Date.now() + n * 864e5);
    const docs = [];
    const mk = (title, description, category, priority, p, e, extra = {}) => docs.push({ title, description, category, priority, publishDate: day(p), expiryDate: e == null ? null : day(e), ...extra });
    mk('Mid-semester exam timetable released', 'The mid-semester examination timetable is now available. Students must carry their ID cards to the hall.', 'Examination', 'High', -1, 20);
    mk('Annual Tech Fest registrations open', 'Register for hackathons, coding contests and robotics events. Teams of up to 4 allowed.', 'Events', 'Normal', -1, 30, { venue: 'Main Auditorium', organizer: 'Student Council', eventDate: day(10) });
    mk('Cricket team trials', 'Trials for the cricket team will be held on the main ground.', 'Sports', 'Normal', -1, 12, { venue: 'Main Ground', organizer: 'Sports Committee', eventDate: day(4) });
    mk('Assignment submission deadline extended', 'The deadline for Data Structures assignment 3 is extended by two days.', 'Academic', 'Normal', -2, 15);
    mk('Campus closed on Friday due to maintenance', 'Classes will not be held this Friday. Regular schedule resumes on Monday.', 'Important Announcements', 'Urgent', -1, 7);
    mk('Library timings revised', 'The library will remain open until 8 PM on weekdays.', 'General Notices', 'Normal', -3, 40);
    mk('Guest lecture on AI and Careers', 'An industry expert will talk about careers in AI and software engineering.', 'Events', 'High', 0, 25, { venue: 'Seminar Hall 2', organizer: 'Events Committee', eventDate: day(6) });
    mk('Scholarship form submission (scheduled)', 'Last date for submitting scholarship forms.', 'Academic', 'High', 3, 20);
    await Notice.insertMany(docs);
  }
  console.log(`Admin ready -> username: ${u}`); await mongoose.disconnect();
})().catch(e => { console.error('Seed failed:', e.message); process.exit(1); });
