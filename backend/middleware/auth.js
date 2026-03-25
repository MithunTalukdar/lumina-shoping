const jwt = require("jsonwebtoken");

function getTokenFromHeader(authorization = "") {
  if (!authorization.startsWith("Bearer ")) {
    return null;
  }
  return authorization.slice(7).trim();
}

function requireAuth(req, res, next) {
  const token = getTokenFromHeader(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ message: "Missing auth token." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_only_secret");
    req.authUser = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired auth token." });
  }
}

module.exports = {
  requireAuth,
};
