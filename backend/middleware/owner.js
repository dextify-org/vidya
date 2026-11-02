import { User, Server } from "../models/index.js";
import jwt from "jsonwebtoken";

import { jwtSecret as JWT_SECRET } from "../config/secrets.js";

const populateUser = async (req, res, next) => {
  if (req.user) return next();

  const authHeader = req.headers.authorization;
  if (!authHeader) return next();

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findByPk(decoded.id);
    next();
  } catch (error) {
    next();
  }
};

const isAuthenticated = (req, res, next) => {
  if (req.user) return next();
  if (req.isAuthenticated()) return next();

  return res.status(401).json({ message: "Authentication required" });
};
const verifyQueryToken = async (req, res, next) => {
  const { token } = req.query;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findByPk(decoded.id);
    next();
  } catch (error) {
    next();
  }
};
const isAdmin = (req, res, next) => {
  try {
    if (req.user?.role === "admin") return next();
    return res.status(403).json({ error: "Admin access required" });
  } catch (error) {
    console.error(error);
    return res.status(403).json({ error: "Admin access required" });
  }
};

const isAdminOrFirstStartUp = async (req, res, next) => {
  try {
    const result = await Server.findAll();

    if (result[0]?.isFirstStartUp || req.user?.role === "admin") {
      return next();
    }

    return res.status(403).json({ error: "Admin access required" });
  } catch (error) {
    console.log(error);
    return res.status(403).json({ error: "Admin access required" });
  }
};

const isOwnerOrAdmin = (model) => async (req, res, next) => {
  try {
    const record = await model.findByPk(req.params.id);

    if (!record) {
      return res.status(404).json({ error: "Not found" });
    }

    if (req.user?.role === "admin" || record.userId === req.user?.id) {
      return next();
    }

    return res.status(403).json({ error: "Access denied" });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
};

export {
  populateUser,
  isAuthenticated,
  isAdmin,
  isAdminOrFirstStartUp,
  isOwnerOrAdmin,
  verifyQueryToken,
};
