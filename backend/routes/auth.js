import { Router } from "express";
import passport from "passport";
import { User } from "../models/index.js";
import { isAuthenticated } from "../middleware/owner.js";
import jwt from "jsonwebtoken";
const router = Router();
import { jwtSecret as JWT_SECRET } from "../config/secrets.js";

router.post("/login", passport.authenticate("local"), (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});
router.post("/token", (req, res, next) => {
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
