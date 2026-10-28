import {
  scan,
  addCourseFolder,
  deleteFolder,
} from "./courseController.js";
import {
  createUser,
  getAdminData,
  updateUser,
  promoteUser,
  removeUser,
} from "./adminController.js";
import { uploadImageCourse, uploadImageInstructor } from "./imageController.js";
import {
  createCategory,
  allCategory,
  courseOfCategories,
  updateCategory,
  deleteCategory,
} from "./categoryController.js";
import {
  createInstructor,
  getAllInstructor,
  individualInstructor,
  updateInstructor,
  deleteInstructor,
} from "./instructorController.js";
import { removeTag } from "./userController.js";

import getUserDashboardAnalytics from "./dashboardController.js";
import { doSearch } from "./searchController.js";

export {
  scan,
  createUser,
  getAdminData,
  uploadImageCourse,
  uploadImageInstructor,
  createCategory,
  createInstructor,
  allCategory,
  courseOfCategories,
  getAllInstructor,
  individualInstructor,
  addCourseFolder,
  getUserDashboardAnalytics,
  deleteFolder,
  updateUser,
  promoteUser,
  removeUser,
  removeTag,
  updateCategory,
  deleteCategory,
  updateInstructor,
  deleteInstructor,
  doSearch,
};
