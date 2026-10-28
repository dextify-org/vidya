import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import Search from "../Search/Search";
import {
  ArrowBack,
  CategoryAlt,
  ChalkboardSolid,
  Cog,
  DashboardSolid,
  GraduationSolid,
  HomeAlt2,
  LogOutCircle,
  Menu,
  User,
} from "../../assets";
import { useAuth } from "../../context/AuthContext";

const PreNav = ({ name, progress }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);
  const menuButtonRef = useRef(null);
  const handleBack = () => navigate(-1);
  const handleHome = () => navigate("/");
  const handleCategories = () => navigate("/categories");
  const handleInstructor = () => navigate("/instructor");
  const handleCourses = () => navigate("/courses");
  const handleSettings = () => navigate("/settings");
  const handleDashboard = () => navigate("/dashboard");
  const { logout } = useAuth();
  const handleLogOut = async () => {
    logout();
  };
  const isRootPage = location.pathname === "/";

  const toggleSidebar = () => {
    setIsSidebarOpen((isOpen) => !isOpen);
  };

  useEffect(() => {
    if (!isSidebarOpen) {
      return undefined;
    }

    const menuButton = menuButtonRef.current;
    const focusableSelector =
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const handleClickOutside = (event) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target) &&
        !menuButton?.contains(event.target)
      ) {
        setIsSidebarOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsSidebarOpen(false);
        return;
      }

      if (event.key !== "Tab" || !sidebarRef.current) {
        return;
      }

      const focusableElements = Array.from(
        sidebarRef.current.querySelectorAll(focusableSelector),
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) {
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    const focusSidebar = window.requestAnimationFrame(() => {
      sidebarRef.current?.querySelector(focusableSelector)?.focus();
    });

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusSidebar);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      menuButton?.focus();
    };
  }, [isSidebarOpen]);

  return (
    <>
      <div className={`pre-nav${isRootPage ? " is-root-page" : ""}`}>
        <div className="left-group">
          <AnimatePresence>
            {!isRootPage && (
              <>
                <button
                  aria-label="Go back"
                  key="back-button"
                  className="navbar-btn"
                  onClick={handleBack}
                  type="button"
                >
                  <div className="svg-div">
                    <ArrowBack />
                  </div>
                </button>
                <button
                  aria-label="Go home"
                  key="home-button"
                  className="navbar-btn"
                  onClick={handleHome}
                  type="button"
                >
                  <div className="svg-div">
                    <HomeAlt2 />
                  </div>
                </button>
              </>
            )}
          </AnimatePresence>
          <button
            ref={menuButtonRef}
            aria-expanded={isSidebarOpen}
            aria-label={isSidebarOpen ? "Close navigation" : "Open navigation"}
            className="menu-bar navbar-btn"
            onClick={toggleSidebar}
            type="button"
          >
            <div className="svg-div">
              <Menu />
            </div>
          </button>
          <div className="pre-nav-name">{name}</div>
        </div>
        <div className="search-bar">
          <Search />
        </div>
        <div className="profile">
          <div className="svg-div">
            {progress ? (
              progress
            ) : (
              <button
                aria-label="Open profile settings"
                className="profile-button"
                onClick={() => navigate("/settings")}
                type="button"
              >
                <User />
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            className="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            ref={sidebarRef}
            aria-label="Main navigation"
            aria-modal="true"
            className="sidebar"
            role="dialog"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-120%" }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
            }}
          >
            <div className="lectures">
              <div className="lecture-label">Courses</div>
              <motion.button
                className="lecture-categories"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCourses}
                type="button"
              >
                <div className="svg-div">
                  <ChalkboardSolid />
                </div>
                All Courses
              </motion.button>
              <motion.button
                className="lecture-categories"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCategories}
                type="button"
              >
                <div className="svg-div">
                  <CategoryAlt />
                </div>
                Categories
              </motion.button>
              <motion.button
                className="lecture-instructor"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleInstructor}
                type="button"
              >
                <div className="svg-div">
                  <GraduationSolid />
                </div>
                Instructors
              </motion.button>
            </div>
            <div className="user">
              <div className="user-label">User</div>
              <motion.button
                className="dashboard-nav"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDashboard}
                type="button"
              >
                <div className="svg-div">
                  <DashboardSolid />
                </div>
                Dashboard
              </motion.button>
              <motion.button
                className="settings"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSettings}
                type="button"
              >
                <div className="svg-div">
                  <Cog />
                </div>
                Settings
              </motion.button>
              <motion.button
                className="log-out"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogOut}
                type="button"
              >
                <div className="svg-div">
                  <LogOutCircle />
                </div>
                Log Out
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PreNav;
