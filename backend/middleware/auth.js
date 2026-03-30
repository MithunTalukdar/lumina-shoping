const jwt = require("jsonwebtoken");
const User = require("../models/User");

function getTokenFromHeader(authorization = "") {
  if (!authorization.startsWith("Bearer ")) {
    return null;
  }
  return authorization.slice(7).trim();
}

function getTokenFromRequest(req) {
  const headerToken = getTokenFromHeader(req.headers.authorization || "");
  if (headerToken) {
    return headerToken;
  }

  if (typeof req.query?.token === "string" && req.query.token.trim()) {
    return req.query.token.trim();
  }

  return null;
}

function verifyAuthToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET || "dev_only_secret");
}

async function requireAuth(req, res, next) {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ message: "Missing auth token." });
  }

  try {
    const payload = verifyAuthToken(token);
    const user = payload?.id ? await User.findById(payload.id).lean() : null;

    if (!user) {
      return res.status(401).json({ message: "Invalid or expired auth token." });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "Your account has been temporarily blocked. Contact support." });
    }

    req.authUser = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired auth token." });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.authUser) {
      return res.status(401).json({ message: "Missing auth token." });
    }

    if (!allowedRoles.includes(req.authUser.role)) {
      return res.status(403).json({ message: "You do not have access to this resource." });
    }

    return next();
  };
}

module.exports = {
  getTokenFromRequest,
  requireAuth,
  requireRole,
  verifyAuthToken,
};
