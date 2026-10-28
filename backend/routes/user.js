import { Router } from "express";
import { removeTag } from "../controllers/index.js";
import {
  isAuthenticated,
  isOwnerOrAdmin,
} from "../middleware/owner.js";
import { TagsAndBookmark } from "../models/index.js";
const router = Router();

router.post(
  "/remove-tag",
  isAuthenticated,
  isOwnerOrAdmin(TagsAndBookmark),
  removeTag,
);
export default router;
