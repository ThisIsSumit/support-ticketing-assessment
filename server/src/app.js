const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const errorHandler = require('./middleware/errorHandler');
const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/tickets', ticketRoutes);
app.use(errorHandler);

module.exports = app;