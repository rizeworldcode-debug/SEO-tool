const mongoose = require('mongoose');

const ProspectSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },
    site: {
      type: String,
      required: true,
      trim: true
    },
    rootDomain: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    daSnapshot: { type: Number, default: 0 },
    paSnapshot: { type: Number, default: 0 },
    ssSnapshot: { type: Number, default: 0 },
    contactStatus: {
      type: String,
      enum: ['new', 'contacted', 'negotiating', 'approved', 'rejected'],
      default: 'new'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    notes: { type: String, default: '' }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Prospect', ProspectSchema);
