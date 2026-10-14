import { Router } from "express";
import passport from "passport";
import { User } from "../models/index.js";
import { isAuthenticated } from "../middleware/owner.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import * as client from "openid-client";
import { OIDC, localLoginEnabled, getOidcConfig } from "../config/oidc.js";
const router = Router();
const JWT_SECRET = "your-jwt-secret-key";

const requireLocalLogin = (req, res, next) =>
  localLoginEnabled
    ? next()
    : res.status(403).json({ message: "Password login is disabled" });

const oidcError = (reason) => Object.assign(new Error(reason), { reason });

// Match by OIDC subject, then link an existing account with the same username.
const findOrCreateOidcUser = async (claims) => {
  const username = claims[OIDC.usernameClaim];
  if (typeof username !== "string" || !username.trim()) {
    throw oidcError("oidc_no_username");
  }

  let user = await User.findOne({ where: { oidcSub: claims.sub } });
  if (!user) {
    user = await User.findOne({ where: { username } });
    if (user?.oidcSub) throw oidcError("oidc_conflict");
    if (!user && !OIDC.autoCreate) throw oidcError("oidc_no_account");
    // OIDC-only accounts get an unguessable password nobody knows.
    user ??= User.build({
      username,
      password: crypto.randomBytes(32).toString("hex"),
    });
    user.oidcSub = claims.sub;
  }
  // Leave the role alone when the provider sent no groups claim at all.
  const groups = claims[OIDC.groupsClaim];
  if (OIDC.adminGroup && groups !== undefined) {
    user.role = [].concat(groups).includes(OIDC.adminGroup) ? "admin" : "user";
  }
  return user.save();
};

router.get("/config", (req, res) => {
  res.json({
    oidcEnabled: OIDC.enabled,
    oidcButtonLabel: OIDC.buttonLabel,
    localLoginEnabled,
  });
});

router.get("/oidc/login", async (req, res, next) => {
  if (!OIDC.enabled) return res.status(404).end();
  try {
    const config = await getOidcConfig();
    const code_verifier = client.randomPKCECodeVerifier();
    const state = client.randomState();
    const nonce = client.randomNonce();
    const url = client.buildAuthorizationUrl(config, {
      redirect_uri: OIDC.redirectUri,
      scope: OIDC.scopes,
      code_challenge: await client.calculatePKCECodeChallenge(code_verifier),
      code_challenge_method: "S256",
      state,
      nonce,
    });
    req.session.oidc = { code_verifier, state, nonce };
    req.session.save((err) => (err ? next(err) : res.redirect(url.href)));
  } catch (error) {
    console.error("OIDC login error:", error);
    res.redirect("/login?error=oidc");
  }
});

router.get("/oidc/callback", async (req, res) => {
  const checks = req.session.oidc;
  delete req.session.oidc;
  if (!OIDC.enabled || !checks) return res.redirect("/login?error=oidc");
  try {
    const config = await getOidcConfig();
    // Rebuild the public callback URL so this works behind a reverse proxy.
    const currentUrl = new URL(OIDC.redirectUri);
    currentUrl.search = new URL(req.originalUrl, "http://localhost").search;
    const tokens = await client.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: checks.code_verifier,
      expectedState: checks.state,
      expectedNonce: checks.nonce,
      idTokenExpected: true,
    });
    const idClaims = tokens.claims();
    const userInfo = config.serverMetadata().userinfo_endpoint
      ? await client.fetchUserInfo(config, tokens.access_token, idClaims.sub)
      : {};
    const user = await findOrCreateOidcUser({ ...idClaims, ...userInfo });
    req.login(user, (err) => {
      if (err) {
        console.error("OIDC session error:", err);
        return res.redirect("/login?error=oidc");
      }
      res.redirect("/");
    });
  } catch (error) {
    console.error("OIDC callback error:", error);
    res.redirect(`/login?error=${error.reason || "oidc"}`);
  }
});

router.post(
  "/login",
  requireLocalLogin,
  passport.authenticate("local"),
  (req, res) => {
    try {
      res.json({ user: req.user });
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  },
);
router.post("/token", requireLocalLogin, (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user)
      return res
        .status(401)
        .json({ message: info.message || "Authentication failed" });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  })(req, res, next);
});
router.post("/logout", (req, res) => {
  try {
    req.logout(() => {
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destruction error:", err);
          return res.status(500).send("Internal Server Error");
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out" });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/user", isAuthenticated, (req, res) => {
  try {
    req.user
      ? res.json({
          id: req.user.id,
          username: req.user.username,
          role: req.user.role,
        })
      : res.status(401).json({ error: "Not authenticated" });
  } catch (error) {
    res.status(500).send("internal server error");
    console.error(error);
  }
});

router.post("/password-change", isAuthenticated, async (req, res) => {
  const { newPassword } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findByPk(userId);
    await user.update({ password: newPassword });
    res.status(201).send("successfully changed password");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
