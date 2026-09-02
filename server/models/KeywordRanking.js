const mongoose = require('mongoose');

const KeywordRankingSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },
    query: {
      type: String,
      required: true,
      trim: true
    },
    rankingUrl: {
      type: String,
      required: true,
      trim: true
    },
    position: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    date: { type: Date, default: Date.now }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('KeywordRanking', KeywordRankingSchema);
