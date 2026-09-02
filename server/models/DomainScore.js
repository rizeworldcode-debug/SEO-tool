const mongoose = require('mongoose');

const SubSignalsSchema = new mongoose.Schema({
  pagerankComponent: { type: Number, required: true },
  ageComponent: { type: Number, required: true },
  securityDiversityComponent: { type: Number, required: true },
  domainAgeDays: { type: Number, required: true },
  blocklistHit: { type: Boolean, default: false },
  highRiskTLD: { type: Boolean, default: false },
  ageSpamRiskPts: { type: Number, default: 0 },
  anchorTextNotEvaluated: { type: Boolean, default: true },
  linkVelocityNotEvaluated: { type: Boolean, default: true },
  pbnFootprintNotEvaluated: { type: Boolean, default: true }
}, { _id: false });

const DomainScoreSchema = new mongoose.Schema({
  domain: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  authorityScore: { type: Number, required: true, min: 0, max: 100 },
  pageScore: { type: Number, required: true, min: 0, max: 100 },
  spamScore: { type: Number, required: true, min: 0, max: 100 },
  referringDomainsBinary: { type: Number, default: 0 },
  rawLinksTotal: { type: Number, default: 0 },
  subSignals: { type: SubSignalsSchema, required: true },
  disclaimer: {
    type: String,
    default: "These SEO metrics (Authority Score, Page Score, Spam Score) are independently calculated and computed by our self-hosted SEO metrics engine. They are NOT Moz's proprietary DA, PA, or Spam Score metrics."
  },
  lastCalculatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('DomainScore', DomainScoreSchema);
