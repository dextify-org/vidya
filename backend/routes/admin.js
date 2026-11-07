import { Router } from "express";
import {
  isAdminOrFirstStartUp,
  isAdmin,
  isAuthenticated,
  verifyQueryToken,
} from "../middleware/owner.js";
import { upload } from "../utils/imageStorage.js";
import {
  uploadImageCourse,
  register,
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
import { scanManager } from "../utils/scanManager.js";
import { Server } from "../models/index.js";
const router = Router();

router.post("/register", isAdminOrFirstStartUp, register);

router.post("/scan", isAdmin, (req, res) => {
  const started = scanManager.startScan();
  if (!started) {
    return res.status(409).json({ message: "Scan already in progress" });
  }
  res
    .status(202)
    .json({ message: "Scan started", status: scanManager.getStatus() });
});

router.get("/scan/status", isAdmin, (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({
    ...scanManager.getStatus(),
    schedule: scanManager.getSchedule(),
  });
});

router.get("/scan/events", verifyQueryToken, isAdmin, (req, res) => {
  scanManager.subscribe(req, res);
});

router.post("/scan/schedule", isAdmin, async (req, res) => {
  const { config, error } = scanManager.normalizeSchedule(req.body || {});

  if (error) {
    return res.status(400).json({ message: error });
  }

  try {
    const server = await Server.findOne({ where: { name: "VIDYA" } });

    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }

    await server.update({
      scanTrigger: config.trigger,
      scanIntervalValue: config.intervalValue,
      scanIntervalUnit: config.intervalUnit,
      scanTime: config.time,
      scanDays: config.days,
    });

    const schedule = scanManager.setSchedule(config);

    res.status(200).json({ message: "Scan schedule updated", schedule });
  } catch (error) {
    console.error(error);
    const status = error.status || 500;
    res.status(status).json({
      message: status === 400 ? error.message : "Failed to update scan schedule",
    });
  }
});
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
