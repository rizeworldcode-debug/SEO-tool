const mongoose = require('mongoose');

const BacklinkSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },
    // Public Live Link created (e.g. https://hashnode.com/@devendra)
    url: {
      type: String,
      required: true,
      trim: true
    },
    // Target Root Domain / Site Domain (e.g. hashnode.com)
    rootDomain: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    // Backlink Submission Type (Profile, Directory, Guest Post, Forum, Web 2.0, Social Bookmark, Article, Comment)
    linkType: {
      type: String,
      default: 'Profile'
    },
    // Traffic estimation (e.g. 50K, 10,000, N/A)
    traffic: {
      type: String,
      default: 'N/A'
    },
    // Link Follow Attribute (Do-Follow vs No-Follow)
    followType: {
      type: String,
      enum: ['Do-Follow', 'No-Follow'],
      default: 'Do-Follow'
    },
    // Submission Status (Approved, Pending, Live, Removed, Broken, Rejected)
    status: {
      type: String,
      default: 'Approved'
    },
    anchorText: {
      type: String,
      default: ''
    },
    targetSite: {
      type: String,
      default: ''
    },
    // Responsible Person (Automatically set to submitting user ID)
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // Responsible Person Name (Auto-filled from user profile)
    responsiblePersonName: {
      type: String,
      default: ''
    },
    // Date Created (Automatically set to Date.now)
    submissionDate: {
      type: Date,
      default: Date.now
    },
    // Authority Metrics Snapshots
    daSnapshot: { type: Number, default: 0 },
    paSnapshot: { type: Number, default: 0 },
    ssSnapshot: { type: Number, default: 0 },
    lastDa: { type: Number, default: 0 },
    lastPa: { type: Number, default: 0 },
    lastSs: { type: Number, default: 0 },
    lastRefreshedAt: { type: Date, default: Date.now },

    // Duplicate detection flag
    duplicateFlag: { type: Boolean, default: false },
    originalBacklinkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Backlink',
      default: null
    },

    // Manual profile overwrites per entry
    manualProfileOverwrites: {
      businessName: { type: String, default: null },
      address: { type: String, default: null },
      phone: { type: String, default: null },
      businessEmail: { type: String, default: null },
      socialLinks: { type: Object, default: null }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Backlink', BacklinkSchema);
