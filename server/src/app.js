const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const errorHandler = require('./middleware/errorHandler');
const app = express();
const dashboardRoutes = require('./routes/dashboard');
const alertRoutes = require('./routes/alerts');
const userRoutes = require('./routes/users');
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/tickets', ticketRoutes);
app.use(errorHandler);

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alerts', alertRoutes);

app.use('/api/users', userRoutes);
module.exports = app;