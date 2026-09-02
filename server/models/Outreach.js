const mongoose = require('mongoose');

const OutreachSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },
    prospectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prospect'
    },
    backlinkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Backlink'
    },
    site: {
      type: String,
      required: true,
      trim: true
    },
    contactEmail: {
      type: String,
      default: '',
      trim: true
    },
    publishedUrl: {
      type: String,
      default: '',
      trim: true
    },
    pitchDate: {
      type: Date,
      default: Date.now
    },
    followUpDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['no_reply', 'in_discussion', 'interested', 'accepted', 'rejected', 'published'],
      default: 'no_reply'
    },
    notes: { type: String, default: '' }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Outreach', OutreachSchema);
