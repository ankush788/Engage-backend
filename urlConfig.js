const FRONTEND_URL =
  process.env.NODE_ENV === "development"
    ? `http://localhost:3000`
    : `https://engage-frontend-chi.vercel.app`;
module.exports = FRONTEND_URL;
