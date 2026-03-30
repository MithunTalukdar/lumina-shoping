const crypto = require("crypto");

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const { sendPasswordResetOtpEmail } = require("../utils/mailer");

const router = express.Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_LENGTH = 6;
const DEFAULT_CLIENT_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];
const GOOGLE_STATE_EXPIRES_IN = "10m";
const GOOGLE_AUTH_SCOPES = ["openid", "email", "profile"];

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isValidEmail(value) {
  return EMAIL_PATTERN.test(normalizeEmail(value));
}

function normalizeOrigin(value) {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }

  try {
    const url = new URL(value.trim());
    return `${url.protocol}//${url.host}`;
  } catch (error) {
    return "";
  }
}

function sanitizeClientPath(value) {
  if (typeof value !== "string") {
    return "/shop";
  }

  const trimmedValue = value.trim();
  if (!trimmedValue.startsWith("/") || trimmedValue.startsWith("//")) {
    return "/shop";
  }

  return trimmedValue;
}

function getAllowedClientOrigins() {
  const configuredOrigins = (process.env.CLIENT_URL || "")
    .split(",")
    .map((value) => normalizeOrigin(value))
    .filter(Boolean);

  const vercelOrigin = normalizeOrigin(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : ""
  );

  return [...new Set([...DEFAULT_CLIENT_ORIGINS, ...configuredOrigins, vercelOrigin].filter(Boolean))];
}

function resolveClientOrigin(origin) {
  const allowedOrigins = getAllowedClientOrigins();
  const normalizedOrigin = normalizeOrigin(origin);

  if (normalizedOrigin && allowedOrigins.includes(normalizedOrigin)) {
    return normalizedOrigin;
  }

  return allowedOrigins[0] || DEFAULT_CLIENT_ORIGINS[0];
}

function getGoogleAuthMode(value) {
  return value === "register" ? "register" : "login";
}

function getGoogleCallbackUrl(req) {
  const configuredCallbackUrl = typeof process.env.GOOGLE_CALLBACK_URL === "string" ? process.env.GOOGLE_CALLBACK_URL.trim() : "";
  if (configuredCallbackUrl) {
    return configuredCallbackUrl;
  }

  const forwardedProto = typeof req.get("x-forwarded-proto") === "string" ? req.get("x-forwarded-proto").split(",")[0].trim() : "";
  const protocol = forwardedProto || req.protocol || "http";
  return `${protocol}://${req.get("host")}/api/auth/google/callback`;
}

function getGoogleOAuthConfig(req) {
  const clientId = typeof process.env.GOOGLE_CLIENT_ID === "string" ? process.env.GOOGLE_CLIENT_ID.trim() : "";
  const clientSecret = typeof process.env.GOOGLE_CLIENT_SECRET === "string" ? process.env.GOOGLE_CLIENT_SECRET.trim() : "";

  if (!clientId || !clientSecret) {
    return {
      error: "Google sign-in is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the backend environment.",
    };
  }

  return {
    clientId,
    clientSecret,
    callbackUrl: getGoogleCallbackUrl(req),
  };
}

function signGoogleState(payload) {
  return jwt.sign(
    {
      ...payload,
      purpose: "google_oauth",
    },
    getJwtSecret(),
    {
      expiresIn: GOOGLE_STATE_EXPIRES_IN,
    }
  );
}

function buildGoogleRedirectUrl({ origin, returnTo, mode, token, error }) {
  const url = new URL(sanitizeClientPath(returnTo), resolveClientOrigin(origin));
  const hashParams = new URLSearchParams({
    authMode: getGoogleAuthMode(mode),
    returnTo: sanitizeClientPath(returnTo),
  });

  if (token) {
    hashParams.set("authToken", token);
  }

  if (error) {
    hashParams.set("authError", error);
  }

  url.hash = hashParams.toString();
  return url.toString();
}

async function exchangeGoogleCode({ code, clientId, clientSecret, redirectUri }) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error_description || payload?.error || "Unable to verify Google sign-in.");
  }

  return payload;
}

async function loadGoogleProfile(accessToken) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    throw new Error("Unable to load your Google profile.");
  }

  return {
    email: normalizeEmail(payload.email),
    emailVerified: Boolean(payload.email_verified),
    name: typeof payload.name === "string" ? payload.name.trim() : "",
  };
}

function getDefaultNameFromEmail(email) {
  const localPart = normalizeEmail(email).split("@")[0] || "Lumina Member";
  return localPart.slice(0, 80);
}

async function findOrCreateGoogleUser(profile) {
  const existingUser = await User.findOne({ email: profile.email });
  if (existingUser) {
    if ((!existingUser.name || existingUser.name.trim().length < 2) && profile.name) {
      existingUser.name = profile.name.slice(0, 80);
      await existingUser.save();
    }

    return existingUser;
  }

  const passwordHash = await bcrypt.hash(crypto.randomUUID(), 12);
  return User.create({
    name: (profile.name || getDefaultNameFromEmail(profile.email)).slice(0, 80),
    email: profile.email,
    passwordHash,
    role: "user",
  });
}

function generateOtp() {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH;
  return String(crypto.randomInt(min, max));
}

function hashToken(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getJwtSecret() {
  return process.env.JWT_SECRET || "dev_only_secret";
}

function getPasswordResetOtpTtlMinutes() {
  return Math.max(5, Number(process.env.PASSWORD_RESET_OTP_TTL_MINUTES || 10));
}

function getPasswordResetResendCooldownSeconds() {
  return Math.max(30, Number(process.env.PASSWORD_RESET_RESEND_COOLDOWN_SECONDS || 60));
}

function getPasswordResetMaxAttempts() {
  return Math.max(1, Number(process.env.PASSWORD_RESET_MAX_ATTEMPTS || 3));
}

function getPasswordResetTokenExpiresIn() {
  return process.env.PASSWORD_RESET_JWT_EXPIRES_IN || "15m";
}

function getPasswordResetTokenTtlMs() {
  const rawValue = String(getPasswordResetTokenExpiresIn()).trim();
  const parsedNumber = Number(rawValue);
  if (Number.isFinite(parsedNumber) && parsedNumber > 0) {
    return parsedNumber * 1000;
  }

  const match = rawValue.match(/^(\d+)([smhd])$/i);
  if (!match) {
    return 15 * 60 * 1000;
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();

  if (unit === "s") {
    return value * 1000;
  }

  if (unit === "m") {
    return value * 60 * 1000;
  }

  if (unit === "h") {
    return value * 60 * 60 * 1000;
  }

  return value * 24 * 60 * 60 * 1000;
}

function toPublicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    addresses: Array.isArray(user.addresses)
      ? user.addresses.map((address) => ({
          id: address._id?.toString?.() || String(address._id || ""),
          name: address.name,
          phone: address.phone,
          addressLine: address.addressLine,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          isDefault: Boolean(address.isDefault),
        }))
      : [],
  };
}

function signToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
}

function signPasswordResetToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      purpose: "password_reset",
    },
    getJwtSecret(),
    {
      expiresIn: getPasswordResetTokenExpiresIn(),
    }
  );
}

function readPasswordResetState(user) {
  return user.passwordReset || {};
}

function setPasswordResetState(user, nextState = {}) {
  user.passwordReset = {
    otpHash: null,
    otpExpiresAt: null,
    otpAttempts: 0,
    resendAvailableAt: null,
    verifiedTokenHash: null,
    verifiedTokenExpiresAt: null,
    lastRequestedAt: null,
    ...readPasswordResetState(user),
    ...nextState,
  };
}

function clearPasswordResetState(user, overrides = {}) {
  user.passwordReset = {
    otpHash: null,
    otpExpiresAt: null,
    otpAttempts: 0,
    resendAvailableAt: null,
    verifiedTokenHash: null,
    verifiedTokenExpiresAt: null,
    lastRequestedAt: null,
    ...overrides,
  };
}

router.get("/google/authorize", async (req, res) => {
  const origin = resolveClientOrigin(req.query.origin);
  const returnTo = sanitizeClientPath(req.query.returnTo);
  const mode = getGoogleAuthMode(req.query.mode);

  try {
    const googleConfig = getGoogleOAuthConfig(req);
    if (googleConfig.error) {
      return res.redirect(
        buildGoogleRedirectUrl({
          origin,
          returnTo,
          mode,
          error: googleConfig.error,
        })
      );
    }

    const state = signGoogleState({
      origin,
      returnTo,
      mode,
    });

    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.set("client_id", googleConfig.clientId);
    googleAuthUrl.searchParams.set("redirect_uri", googleConfig.callbackUrl);
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", GOOGLE_AUTH_SCOPES.join(" "));
    googleAuthUrl.searchParams.set("state", state);
    googleAuthUrl.searchParams.set("access_type", "online");
    googleAuthUrl.searchParams.set("include_granted_scopes", "true");
    googleAuthUrl.searchParams.set("prompt", "select_account");

    return res.redirect(googleAuthUrl.toString());
  } catch (error) {
    return res.redirect(
      buildGoogleRedirectUrl({
        origin,
        returnTo,
        mode,
        error: "Unable to start Google sign-in right now. Please try again.",
      })
    );
  }
});

router.get("/google/callback", async (req, res) => {
  let origin = resolveClientOrigin("");
  let returnTo = "/shop";
  let mode = "login";

  try {
    const stateToken = typeof req.query.state === "string" ? req.query.state.trim() : "";
    if (!stateToken) {
      throw new Error("Missing Google sign-in state.");
    }

    const statePayload = jwt.verify(stateToken, getJwtSecret());
    if (!statePayload || statePayload.purpose !== "google_oauth") {
      throw new Error("Invalid Google sign-in state.");
    }

    origin = resolveClientOrigin(statePayload.origin);
    returnTo = sanitizeClientPath(statePayload.returnTo);
    mode = getGoogleAuthMode(statePayload.mode);

    if (typeof req.query.error === "string" && req.query.error.trim()) {
      const canceledMessage =
        req.query.error === "access_denied"
          ? "Google sign-in was canceled before it finished."
          : "Google sign-in could not be completed. Please try again.";

      return res.redirect(
        buildGoogleRedirectUrl({
          origin,
          returnTo,
          mode,
          error: canceledMessage,
        })
      );
    }

    const authorizationCode = typeof req.query.code === "string" ? req.query.code.trim() : "";
    if (!authorizationCode) {
      throw new Error("Missing Google authorization code.");
    }

    const googleConfig = getGoogleOAuthConfig(req);
    if (googleConfig.error) {
      throw new Error(googleConfig.error);
    }

    const tokenPayload = await exchangeGoogleCode({
      code: authorizationCode,
      clientId: googleConfig.clientId,
      clientSecret: googleConfig.clientSecret,
      redirectUri: googleConfig.callbackUrl,
    });

    const googleProfile = await loadGoogleProfile(tokenPayload.access_token);
    if (!googleProfile.email || !googleProfile.emailVerified) {
      throw new Error("Your Google account needs a verified email address before you can continue.");
    }

    const user = await findOrCreateGoogleUser(googleProfile);
    if (user.isBlocked) {
      throw new Error("Your account has been temporarily blocked. Contact support.");
    }

    return res.redirect(
      buildGoogleRedirectUrl({
        origin,
        returnTo,
        mode,
        token: signToken(user),
      })
    );
  } catch (error) {
    return res.redirect(
      buildGoogleRedirectUrl({
        origin,
        returnTo,
        mode,
        error: error instanceof Error ? error.message : "Google sign-in failed. Please try again.",
      })
    );
  }
});

router.post("/register", async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = req.body.password || "";

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required." });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: "user",
    });

    const token = signToken(user);
    return res.status(201).json({
      user: toPublicUser(user),
      token,
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ message: "Email is already registered." });
    }
    return res.status(500).json({ message: "Failed to register user." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password || "";

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "Your account has been temporarily blocked. Contact support." });
    }

    const passwordIsValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordIsValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = signToken(user);
    return res.json({
      user: toPublicUser(user),
      token,
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed." });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    const genericMessage = "If an account exists for that email, an OTP has been sent.";
    const otpTtlMinutes = getPasswordResetOtpTtlMinutes();
    const resendCooldownSeconds = getPasswordResetResendCooldownSeconds();
    const fallbackResponse = {
      message: genericMessage,
      cooldownSeconds: resendCooldownSeconds,
      expiresInMinutes: otpTtlMinutes,
    };

    const user = await User.findOne({ email });
    if (!user) {
      return res.json(fallbackResponse);
    }

    const currentState = readPasswordResetState(user);
    const now = Date.now();
    const resendAvailableAt = currentState.resendAvailableAt ? new Date(currentState.resendAvailableAt).getTime() : 0;
    if (resendAvailableAt > now) {
      return res.json({
        ...fallbackResponse,
        cooldownSeconds: Math.max(1, Math.ceil((resendAvailableAt - now) / 1000)),
      });
    }

    const otp = generateOtp();
    setPasswordResetState(user, {
      otpHash: await bcrypt.hash(otp, 10),
      otpExpiresAt: new Date(now + otpTtlMinutes * 60 * 1000),
      otpAttempts: 0,
      resendAvailableAt: new Date(now + resendCooldownSeconds * 1000),
      verifiedTokenHash: null,
      verifiedTokenExpiresAt: null,
      lastRequestedAt: new Date(now),
    });

    await user.save();

    try {
      await sendPasswordResetOtpEmail({
        email: user.email,
        name: user.name,
        otp,
        expiresInMinutes: otpTtlMinutes,
      });
    } catch (error) {
      clearPasswordResetState(user);
      await user.save();
      return res.status(500).json({ message: "Unable to send a reset code right now. Please try again shortly." });
    }

    return res.json(fallbackResponse);
  } catch (error) {
    return res.status(500).json({ message: "Unable to process password recovery right now." });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = typeof req.body.otp === "string" ? req.body.otp.replace(/\D/g, "") : "";

    if (!isValidEmail(email) || otp.length < 4 || otp.length > 6) {
      return res.status(400).json({ message: "Enter a valid email and OTP." });
    }

    const user = await User.findOne({ email });
    const invalidOtpResponse = { message: "Invalid or expired OTP. Request a new code." };

    if (!user || !readPasswordResetState(user).otpHash) {
      return res.status(400).json(invalidOtpResponse);
    }

    const currentState = readPasswordResetState(user);
    const now = Date.now();
    const otpExpiresAt = currentState.otpExpiresAt ? new Date(currentState.otpExpiresAt).getTime() : 0;
    const maxAttempts = getPasswordResetMaxAttempts();

    if (!otpExpiresAt || otpExpiresAt < now) {
      clearPasswordResetState(user);
      await user.save();
      return res.status(400).json(invalidOtpResponse);
    }

    if ((currentState.otpAttempts || 0) >= maxAttempts) {
      clearPasswordResetState(user, {
        resendAvailableAt: currentState.resendAvailableAt || null,
      });
      await user.save();
      return res.status(429).json({ message: "OTP attempts exceeded. Request a new code." });
    }

    const otpMatches = await bcrypt.compare(otp, currentState.otpHash);
    if (!otpMatches) {
      const nextAttempts = (currentState.otpAttempts || 0) + 1;
      setPasswordResetState(user, {
        otpAttempts: nextAttempts,
        verifiedTokenHash: null,
        verifiedTokenExpiresAt: null,
      });

      if (nextAttempts >= maxAttempts) {
        user.passwordReset.otpHash = null;
        user.passwordReset.otpExpiresAt = null;
      }

      await user.save();

      return res.status(nextAttempts >= maxAttempts ? 429 : 400).json(
        nextAttempts >= maxAttempts
          ? { message: "OTP attempts exceeded. Request a new code." }
          : invalidOtpResponse
      );
    }

    const resetToken = signPasswordResetToken(user);

    clearPasswordResetState(user, {
      verifiedTokenHash: hashToken(resetToken),
      verifiedTokenExpiresAt: new Date(now + getPasswordResetTokenTtlMs()),
      lastRequestedAt: currentState.lastRequestedAt || new Date(now),
    });

    await user.save();

    return res.json({
      message: "OTP verified successfully.",
      resetToken,
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to verify OTP right now." });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const resetToken = typeof req.body.resetToken === "string" ? req.body.resetToken.trim() : "";
    const newPassword = req.body.newPassword || "";
    const confirmPassword = req.body.confirmPassword || "";

    if (!resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Reset token and both password fields are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New password and confirm password must match." });
    }

    let payload;

    try {
      payload = jwt.verify(resetToken, getJwtSecret());
    } catch (error) {
      return res.status(401).json({ message: "Reset session expired. Start again." });
    }

    if (!payload || payload.purpose !== "password_reset" || !payload.id || !payload.email) {
      return res.status(401).json({ message: "Reset session expired. Start again." });
    }

    const user = await User.findById(payload.id);
    if (!user || normalizeEmail(payload.email) !== user.email) {
      return res.status(401).json({ message: "Reset session expired. Start again." });
    }

    const currentState = readPasswordResetState(user);
    const verifiedTokenExpiresAt = currentState.verifiedTokenExpiresAt ? new Date(currentState.verifiedTokenExpiresAt).getTime() : 0;
    const isResetSessionValid =
      currentState.verifiedTokenHash &&
      currentState.verifiedTokenHash === hashToken(resetToken) &&
      verifiedTokenExpiresAt > Date.now();

    if (!isResetSessionValid) {
      return res.status(401).json({ message: "Reset session expired. Start again." });
    }

    const matchesExistingPassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (matchesExistingPassword) {
      return res.status(400).json({ message: "New password must be different from the current password." });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    clearPasswordResetState(user);
    await user.save();

    return res.json({ message: "Password reset successful. Please log in with your new password." });
  } catch (error) {
    return res.status(500).json({ message: "Unable to reset password right now." });
  }
});

router.post("/logout", requireAuth, (_req, res) => {
  return res.json({ message: "Logged out." });
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.authUser.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    return res.json({ user: toPublicUser(user) });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load current user." });
  }
});

module.exports = router;
