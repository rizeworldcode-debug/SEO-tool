// ================================
// PRODUCTION / LIVE URL CONFIG
// Change URLs here only
// ================================

const FRONTEND_URL = process.env.FRONTEND_URL || "https://seo-tool-plum.vercel.app";
const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://localhost:8000";

module.exports = {
  FRONTEND_URL,
  PYTHON_API_URL
};
