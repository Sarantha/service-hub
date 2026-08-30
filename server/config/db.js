const mongoose = require('mongoose');
const Branch = require('../models/Branch');
const InventoryCategory = require('../models/InventoryCategory');

let listenersAttached = false;
let connectPromise = null;

// Serverless hosts (Vercel) freeze the whole process between requests, so an
// idle connection can be silently dropped by the network during a freeze.
// connectDB() is re-callable: if the connection has dropped, it starts a
// fresh connect attempt and caches that in-flight promise so concurrent
// requests during a reconnect share one attempt instead of racing.
const connectDB = () => {
  const mongoUri = process.env.MONGO_DB_CONNECTION;
  if (!mongoUri) {
    console.error('❌ CRITICAL: MONGO_DB_CONNECTION environment variable missing.');
    return Promise.resolve();
  }

  if (mongoose.connection.readyState === 1) {
    return Promise.resolve();
  }

  if (connectPromise) {
    return connectPromise;
  }

  if (!listenersAttached) {
    listenersAttached = true;
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected successfully');
      seedDefaultBranch();
      seedDefaultInventoryCategories();
    });

    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected. Will reconnect on next request.');
      connectPromise = null;
    });
  }

  const options = {
    family: 4, // Force IPv4 to prevent connection stalling/slowdowns
    serverSelectionTimeoutMS: 8000 // fail/retry fast instead of hanging near the function timeout
  };

  connectPromise = mongoose.connect(mongoUri, options).catch((error) => {
    console.error('❌ MongoDB connection failed:', error.message);
    connectPromise = null;
    // Graceful failure - do not crash the application process (Guardrail #6)
  });

  return connectPromise;
};

const seedDefaultBranch = async () => {
  try {
    const branchCount = await Branch.countDocuments();
    if (branchCount === 0) {
      await Branch.create({
        branchName: 'Colombo Main Branch',
        code: 'CMB-01',
        isActive: true,
        isDeleted: false
      });
      console.log('🌱 Seeded default branch: Colombo Main Branch (CMB-01)');
    }
  } catch (error) {
    console.error('❌ Error seeding default branch:', error.message);
  }
};

// One-time seed of the categories that used to be a hardcoded enum on the
// Inventory model — preserves every existing item's category now that
// categories are a Super-Admin-managed collection instead of a fixed list.
const DEFAULT_CATEGORIES = ['Oils & Fluids', 'Filters', 'Brakes', 'Electrical', 'Body Parts', 'Body Components', 'Tyres'];

const seedDefaultInventoryCategories = async () => {
  try {
    const categoryCount = await InventoryCategory.countDocuments();
    if (categoryCount === 0) {
      await InventoryCategory.insertMany(DEFAULT_CATEGORIES.map((name) => ({ name })));
      console.log(`🌱 Seeded ${DEFAULT_CATEGORIES.length} default inventory categories`);
    }
  } catch (error) {
    console.error('❌ Error seeding default inventory categories:', error.message);
  }
};

module.exports = connectDB;
