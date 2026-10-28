import { Server } from "../models/index.js";

const isAuthenticated = (req, res, next) => {
  if (req.user) return next();
  if (req.isAuthenticated()) return next();

  return res.status(401).json({ message: "Authentication required" });
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
    const recordId = req.params.id ?? req.body?.id;
    const record = recordId ? await model.findByPk(recordId) : null;

    if (!record) {
      return res.status(404).json({ error: "Not found" });
    }

    const ownerId = record.UserId ?? record.userId;
    if (req.user?.role === "admin" || ownerId === req.user?.id) {
      req.ownedRecord = record;
      return next();
    }

    return res.status(403).json({ error: "Access denied" });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
};

export {
  isAuthenticated,
  isAdmin,
  isAdminOrFirstStartUp,
  isOwnerOrAdmin,
};
