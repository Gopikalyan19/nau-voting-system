const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Routes
const authRoutes = require('./routes/authRoutes');
const electionRoutes = require('./routes/electionRoutes');
const roleRoutes = require('./routes/roleRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const voteRoutes = require('./routes/voteRoutes');
const resultRoutes = require('./routes/resultRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

/* =========================
   MIDDLEWARE
========================= */

// Security headers
app.use(helmet());

// CORS (allow frontend access)
app.use(cors({
  origin: "*", // change later to your frontend URL
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Body parser
app.use(express.json({ limit: '1mb' }));

// Logger
app.use(morgan('dev'));


/* =========================
   HEALTH CHECK (RENDER)
========================= */

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});


/* =========================
   ROOT ROUTE
========================= */

app.get('/', (req, res) => {
  res.json({
    message: 'NAU Voting System API is running',
    version: '2.0.0',
    endpoints: [
      '/api/auth',
      '/api/elections',
      '/api/roles',
      '/api/candidates',
      '/api/votes',
      '/api/results',
      '/api/dashboard'
    ]
  });
});


/* =========================
   API ROUTES
========================= */

app.use('/api/auth', authRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/dashboard', dashboardRoutes);


/* =========================
   404 HANDLER
========================= */

app.use((req, res) => {
  res.status(404).json({
    error: 'API route not found'
  });
});


/* =========================
   GLOBAL ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  console.error("ERROR:", err);

  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});


/* =========================
   SERVER START
========================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
