const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema(
  {
    // 1. Website & Project Info
    businessName: { type: String, required: true, trim: true },
    projectUrl: { type: String, required: true, trim: true },
    targetLocation: { type: String, default: '' },
    goal: { type: String, default: '' },
    category: { type: String, default: '' },
    username: { type: String, default: '' },
    domainAuthority: { type: Number, default: 0 },
    pageAuthority: { type: Number, default: 0 },
    spamScore: { type: Number, default: 0 },
    targetKeywords: [{ type: String, trim: true }],

    // 2. Business Listing Details (NAP & Citations)
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    designation: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    postcode: { type: String, default: '' },
    country: { type: String, default: '' },
    website: { type: String, default: '' },
    phone: { type: String, default: '' },
    businessEmail: { type: String, default: '' },
    numberOfEmployees: { type: String, default: '' },
    businessHours: { type: String, default: '' },
    yearOfEstablishment: { type: String, default: '' },

    // 3. Social Media Profiles
    socialLinks: {
      facebook: { type: String, default: '' },
      instagram: { type: String, default: '' },
      youtube: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      twitter: { type: String, default: '' },
      other: { type: String, default: '' }
    },

    // 4. Encrypted credentials stored at rest via AES-256-GCM
    offPageLogin: {
      iv: { type: String },
      encryptedData: { type: String },
      authTag: { type: String }
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Project', ProjectSchema);
