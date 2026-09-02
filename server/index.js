require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { getDomain } = require('tldts');
const mongoose = require('mongoose');

// Utility assertions to enforce startup security checks
const { assertEncryptionConfigured } = require('./utils/encryption');
const { assertJwtConfigured } = require('./utils/auth');
const { assertActiveMetricsProviderConfigured } = require('./providers');

// Fail server startup immediately if required security environment variables are missing
try {
  assertEncryptionConfigured();
  assertJwtConfigured();
  assertActiveMetricsProviderConfigured();
  console.log('[Server Startup Security] Environment keys (ENCRYPTION_KEY, JWT_SECRET, & ACTIVE_METRICS_PROVIDER) verified successfully.');
} catch (err) {
  console.error('================================================================');
  console.error('[Server Startup Security FAILURE]');
  console.error(err.message);
  console.error('================================================================');
  process.exit(1);
}

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const backlinkRoutes = require('./routes/backlinkRoutes');
const metricsRoutes = require('./routes/metricsRoutes');
const prospectRoutes = require('./routes/prospectRoutes');
const outreachRoutes = require('./routes/outreachRoutes');
const reportRoutes = require('./routes/reportRoutes');

const User = require('./models/User');
const { FRONTEND_URL, PYTHON_API_URL } = require('./config');

const app = express();
const PORT = process.env.PORT || 5005;

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' ? FRONTEND_URL : true,
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/backlinks', backlinkRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/prospects', prospectRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/reports', reportRoutes);

// Load synced Parquet-to-JSON fallback data for internal SEO engine
const JSON_DATA_PATH = path.join(__dirname, '../pipeline/data/domain_scores_mongo.json');
let fallbackScoresMap = new Map();

function loadFallbackData() {
  if (fs.existsSync(JSON_DATA_PATH)) {
    try {
      const raw = fs.readFileSync(JSON_DATA_PATH, 'utf-8');
      const list = JSON.parse(raw);
      fallbackScoresMap.clear();
      list.forEach(item => fallbackScoresMap.set(item.domain.toLowerCase(), item));
      console.log(`[Express API] Loaded ${fallbackScoresMap.size} domain scores from JSON fallback cache.`);
    } catch (err) {
      console.error('[Express API] Error parsing fallback JSON cache:', err);
    }
  } else {
    console.warn(`[Express API] Warning: Fallback JSON cache missing at ${JSON_DATA_PATH}`);
  }
}

loadFallbackData();

// Real MongoDB Atlas Connection Config
const MONGO_URI = process.env.MONGO_URI;
let isMongoConnected = false;

if (!MONGO_URI) {
  console.error('[Express API CRITICAL ERROR] MONGO_URI is missing in .env file!');
  process.exit(1);
}

async function bootstrapAdminUser() {
  try {
    const adminExists = await User.findOne({ email: 'admin@rizeworld.com' });
    if (!adminExists) {
      const defaultAdmin = new User({
        username: 'DEMO_ADMIN',
        email: 'admin@rizeworld.com',
        password: 'AdminPass123!',
        role: 'admin'
      });
      await defaultAdmin.save();
      console.log('[Bootstrap] Created Admin user in MongoDB Atlas: admin@rizeworld.com / AdminPass123!');
    }

    const leaderExists = await User.findOne({ email: 'leader@rizeworld.com' });
    if (!leaderExists) {
      const defaultLeader = new User({
        username: 'DEMO_TEAM_LEADER',
        email: 'leader@rizeworld.com',
        password: 'LeaderPass123!',
        role: 'team_leader'
      });
      await defaultLeader.save();
      console.log('[Bootstrap] Created Team Leader user in MongoDB Atlas: leader@rizeworld.com / LeaderPass123!');
    }

    const memberExists = await User.findOne({ email: 'member@rizeworld.com' });
    if (!memberExists) {
      const defaultMember = new User({
        username: 'DEMO_TEAM_MEMBER',
        email: 'member@rizeworld.com',
        password: 'MemberPass123!',
        role: 'team_member'
      });
      await defaultMember.save();
      console.log('[Bootstrap] Created Team Member user in MongoDB Atlas: member@rizeworld.com / MemberPass123!');
    }
  } catch (err) {
    console.error('[Bootstrap] Failed to bootstrap default users in MongoDB Atlas:', err.message);
  }
}

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 30000 })
  .then(async () => {
    isMongoConnected = true;
    console.log(`[Express API] Successfully connected to Real MongoDB Atlas Cloud Database!`);
    await bootstrapAdminUser();
  })
  .catch((err) => {
    console.error(`[Express API ERROR] Could not connect to MongoDB Atlas (${MONGO_URI}):`, err.message);
  });

const DISCLAIMER_TEXT = "These SEO metrics (Authority Score, Page Score, Spam Score) are independently calculated and computed by our self-hosted SEO metrics engine. They are NOT Moz's proprietary DA, PA, or Spam Score metrics.";

// 1. GET /api/health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mongoConnected: isMongoConnected,
    cachedDomainsCount: fallbackScoresMap.size,
    timestamp: new Date().toISOString()
  });
});

// 2. GET /api/domain/:domain
app.get('/api/domain/:domain', async (req, res) => {
  try {
    const rawDomain = req.params.domain.trim().toLowerCase();
    const cleanDomain = getDomain(rawDomain) || rawDomain;

    if (isMongoConnected) {
      const DomainScore = require('./models/DomainScore');
      const doc = await DomainScore.findOne({ domain: cleanDomain });
      if (doc) {
        return res.json(doc);
      }
    }

    if (fallbackScoresMap.has(cleanDomain)) {
      return res.json(fallbackScoresMap.get(cleanDomain));
    }

    // Default response for unindexed / new domain
    return res.json({
      domain: cleanDomain,
      authorityScore: 12.6,
      pageScore: 12.6,
      spamScore: 0.7,
      referringDomainsBinary: 0,
      rawLinksTotal: 0,
      subSignals: {
        pagerankComponent: 3.1,
        ageComponent: 20.0,
        securityDiversityComponent: 50.0,
        domainAgeDays: 365,
        blocklistHit: false,
        highRiskTLD: false,
        ageSpamRiskPts: 3.8,
        anchorTextNotEvaluated: true,
        linkVelocityNotEvaluated: true,
        pbnFootprintNotEvaluated: true
      },
      disclaimer: DISCLAIMER_TEXT,
      lastCalculatedAt: Math.floor(Date.now() / 1000)
    });
  } catch (err) {
    console.error('Error fetching domain score:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// 3. GET /api/page?url=...
app.get('/api/page', async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing required query parameter: url' });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(targetUrl.includes('://') ? targetUrl : `https://${targetUrl}`);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL string provided' });
    }

    const domain = getDomain(parsedUrl.hostname) || parsedUrl.hostname;

    let parentAs = 12.6;
    if (fallbackScoresMap.has(domain)) {
      parentAs = fallbackScoresMap.get(domain).authorityScore;
    }

    const pathSegments = parsedUrl.pathname.split('/').filter(p => p.length > 0);
    const pathDepth = pathSegments.length;
    const pathPenalty = Math.pow(0.90, pathDepth);

    const queryParamsCount = Array.from(parsedUrl.searchParams.keys()).length;
    const paramPenalty = Math.pow(0.95, queryParamsCount);

    const rawInLinks = parseInt(req.query.inLinks || '0', 10);
    const linkBoost = 1.0 + 0.1 * Math.log(1.0 + Math.max(0, rawInLinks));

    const rawPs = parentAs * pathPenalty * paramPenalty * linkBoost;
    const finalPs = parseFloat(Math.min(100.0, Math.max(0.0, rawPs)).toFixed(1));

    res.json({
      url: targetUrl,
      domain: domain,
      pageScore: finalPs,
      parentAuthorityScore: parentAs,
      pathDepth: pathDepth,
      pathPenalty: parseFloat(pathPenalty.toFixed(4)),
      queryParamsCount: queryParamsCount,
      paramPenalty: parseFloat(paramPenalty.toFixed(4)),
      inboundLinksCount: rawInLinks,
      linkBoost: parseFloat(linkBoost.toFixed(4)),
      disclaimer: DISCLAIMER_TEXT
    });
  } catch (err) {
    console.error('Error computing page score:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// Start Express Server only when run directly as main module
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`[Express API Server] Running on http://localhost:${PORT}`);
  });
}

module.exports = app;
