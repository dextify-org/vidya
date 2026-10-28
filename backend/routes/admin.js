import { Router } from "express";
import {
  isAdmin,
  isAuthenticated,
} from "../middleware/owner.js";
import { upload } from "../utils/imageStorage.js";
import {
  uploadImageCourse,
  scan,
  createCategory,
  createUser,
  getAdminData,
  createInstructor,
  uploadImageInstructor,
  addCourseFolder,
  deleteFolder,
  updateUser,
  promoteUser,
  removeUser,
  updateCategory,
  deleteCategory,
  updateInstructor,
  deleteInstructor,
} from "../controllers/index.js";
const router = Router();

router.post("/scan", isAdmin, scan);
router.post("/add-user", isAdmin, createUser);
router.get("/admin", isAdmin, getAdminData);
router.post("/category", isAdmin, createCategory);
router.post("/instructor", isAdmin, createInstructor);
router.post("/form/course", isAdmin, upload.single("file"), uploadImageCourse);
router.post(
  "/form/instructor",
  isAdmin,
  upload.single("file"),
  uploadImageInstructor
);

router.post("/folders", isAdmin, addCourseFolder);
router.post("/folderdelete", isAdmin, deleteFolder);
router.post("/update-user", isAdmin, updateUser);
router.post("/promote-user", isAdmin, promoteUser);
router.post("/remove-user", isAdmin, removeUser);
router.post("/update-category", isAdmin, updateCategory);
router.post("/delete-category", isAdmin, deleteCategory);
router.post("/update-instructor", isAdmin, updateInstructor);
router.post("/delete-instructor", isAdmin, deleteInstructor);

export default router;
