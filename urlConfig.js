const FRONTEND_URL =
  process.env.NODE_ENV === "development"
    ? `https://engage-frontend-chi.vercel.app`
    : `https://engage-frontend-chi.vercel.app`;
module.exports = FRONTEND_URL;
