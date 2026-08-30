require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  const passwordHash = await bcrypt.hash('password123', 10);
  await User.create([
    { email: 'supervisor@demo.com', passwordHash, name: 'Sam Supervisor', role: 'supervisor' },
    { email: 'agent@demo.com', passwordHash, name: 'Alex Agent', role: 'agent' },
  ]);
  console.log('Seeded users');
  process.exit(0);
}
seed();