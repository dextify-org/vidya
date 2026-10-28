import { Router } from "express";
import passport from "passport";
import { User } from "../models/index.js";
import { isAuthenticated } from "../middleware/owner.js";
import jwt from "jsonwebtoken";
import { getSecuritySecrets } from "../security/secrets.js";
import { regenerateAndLogin } from "../security/auth.js";
import { toSafeUser } from "../security/user.js";
import { verifyPassword } from "../security/password.js";
const router = Router();

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

const authenticateLocal = (req, res) =>
  new Promise((resolve, reject) => {
    passport.authenticate("local", (error, user, info) => {
      if (error) return reject(error);
      return resolve({ user, info });
    })(req, res);
  });

router.post("/login", async (req, res, next) => {
  try {
    const { user, info } = await authenticateLocal(req, res);
    if (!user) {
      return res
        .status(401)
        .json({ message: info?.message || "Authentication failed" });
    }

    await regenerateAndLogin(req, user);
    return res.json({ user: toSafeUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post("/token", async (req, res, next) => {
  try {
    const { user, info } = await authenticateLocal(req, res);
    if (!user) {
      return res
        .status(401)
        .json({ message: info?.message || "Authentication failed" });
    }

    const { jwtSecret } = await getSecuritySecrets();
    const token = jwt.sign({ id: user.id }, jwtSecret, {
      algorithm: "HS256",
      expiresIn: "7d",
    });

    return res.json({
      token,
      user: toSafeUser(user),
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", (req, res) => {
  try {
    req.logout(() => {
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destruction error:", err);
          return res.status(500).send("Internal Server Error");
        }
        res.clearCookie("connect.sid", {
          httpOnly: true,
          sameSite: "strict",
          secure:
            process.env.SESSION_COOKIE_SECURE === "true" || req.secure,
        });
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
      ? res.json(toSafeUser(req.user))
      : res.status(401).json({ error: "Not authenticated" });
  } catch (error) {
    res.status(500).send("internal server error");
    console.error(error);
  }
});

router.post("/password-change", isAuthenticated, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const userId = req.user.id;

  try {
    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      newPassword.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Current and new passwords are required" });
    }

    const user = await User.scope("withPassword").findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const verification = verifyPassword(
      currentPassword,
      user.password,
      user.salt,
    );
    if (!verification.valid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    await user.update({ password: newPassword });
    await regenerateAndLogin(req, user);
    return res.status(201).send("successfully changed password");
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
});

export default router;
