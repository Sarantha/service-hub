const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const jobCardRoutes = require('./routes/jobCardRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const reportRoutes = require('./routes/reportRoutes');
const portalRoutes = require('./routes/portalRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const vehicleRoutes     = require('./routes/vehicleRoutes');
const userRoutes        = require('./routes/userRoutes');
const inventoryCategoryRoutes = require('./routes/inventoryCategoryRoutes');
const branchRoutes = require('./routes/branchRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Global Middlewares
app.use(cors());
app.use(express.json());

// Database Connection Guard Middleware (Guardrail #6)
// Returns 503 Service Unavailable if database is offline for all API calls
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/health') {
    return next();
  }
  if (mongoose.connection.readyState !== 1) {
    const error = new Error('Database service is currently unavailable. Please try again later.');
    error.statusCode = 503;
    return next(error);
  }
  next();
});

// Mount Endpoint Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/job-cards', jobCardRoutes);
app.use('/api/v1/jobcards', jobCardRoutes); // Frontend fallback
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/billing', invoiceRoutes); // Frontend fallback
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/portal', portalRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/vehicles',     vehicleRoutes);
app.use('/api/v1/users',        userRoutes);
app.use('/api/v1/inventory-categories', inventoryCategoryRoutes);
app.use('/api/v1/branches', branchRoutes);

// Base Routes
app.get('/', (req, res) => {
  res.json({ success: true, message: 'ServiceHub API Server is running.' });
});

app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({ 
    success: true,
    server: 'running', 
    database: statusMap[dbStatus] 
  });
});

// Centralized Global Error Handler Middleware
app.use(errorHandler);

// Only bind a port when run directly (local dev / traditional host).
// When imported as a module (e.g. by a Vercel serverless function), the
// host platform handles the request lifecycle and this listen() is skipped.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

module.exports = app;