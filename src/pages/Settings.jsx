import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import Toast from "../components/Toast/Toast";
import PreNav from "../components/Navbar/PreNav";
import Admin from "../components/Settings/Admin";
import ThemePreferences from "../components/Settings/ThemePreferences";
import { useAuth } from "../context/AuthContext";
import axios from "../api/axiosInstance";
const Settings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const path = location.pathname.split("/").pop();

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "display", label: "Display" },
    ...(user?.role === "admin" ? [{ id: "admin", label: "Admin" }] : []),
  ];

  const validTab = tabs.find((tab) => tab.id === path);
  const [activeTab, setActiveTab] = useState(validTab?.id || tabs[0].id);

  useEffect(() => {
    if (path === "admin" && user?.role !== "admin") {
      navigate(`/settings/${tabs[0].id}`, { replace: true });
      return;
    }

    if (!validTab) {
      navigate(`/settings/${tabs[0].id}`, { replace: true });
    } else {
      setActiveTab(validTab.id);
    }
  }, [location.pathname, navigate, validTab, path, user]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    navigate(`/settings/${tabId}`, { replace: true });
  };

  return (
    <>
      <PreNav name="SETTINGS" />
      <div className="settings-container">
        <div className="settings-sidebar">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              className={`sidebar-tab ${
                activeTab === tab.id ? "active-indicator" : ""
              }`}
              onClick={() => handleTabChange(tab.id)}
              type="button"
            >
              {tab.label}
            </motion.button>
          ))}
        </div>
        <div className="settings-sidebar-info">
          <div style={{ height: "100%" }} key={activeTab}>
            {activeTab === "profile" && <ProfileSettings user={user} />}
            {activeTab === "display" && <ThemePreferences />}
            {activeTab === "admin" && user?.role === "admin" && <Admin />}
          </div>
        </div>
      </div>
    </>
  );
};

const ProfileSettings = ({ user }) => {
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmNewPass, setConfirmNewPass] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Completed successfully");
  const [toastType, setToastType] = useState("success");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handlePassChange = async () => {
    setShowToast(false);

    if (
      currentPass.length > 0 &&
      newPass.length > 0 &&
      confirmNewPass.length > 0
    ) {
      if (newPass !== confirmNewPass) {
        setToastType("error");
        setToastMessage("Passwords don't match");
        setShowToast(true);
        return;
      }

      if (newPass.length < 8) {
        setToastType("error");
        setToastMessage("Password must be at least 8 characters long");
        setShowToast(true);
        return;
      }

      try {
        setIsChangingPassword(true);
        await axios.post(
          "/api/auth/password-change",
          {
            currentPassword: currentPass,
            newPassword: newPass,
          },
          { withCredentials: true }
        );

        setToastType("success");
        setToastMessage("Password changed successfully");
        setShowToast(true);
        setCurrentPass("");
        setNewPass("");
        setConfirmNewPass("");
      } catch (error) {
        const errorMessage =
          error.response?.data?.message || "Failed to change password";
        setToastType("error");
        setToastMessage(errorMessage);
        setShowToast(true);
        console.error("Password change error:", error);
      } finally {
        setIsChangingPassword(false);
      }
    } else {
      setToastType("error");
      setToastMessage("Please fill in all password fields");
      setShowToast(true);
    }
  };
  return (
    <>
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          duration={3000}
          onClose={() => setShowToast(false)}
        />
      )}
      <div className="settings-content">
        <div className="settings-title">Profile Settings</div>
        <div className="img-container">{user?.username}</div>
        <form
          aria-busy={isChangingPassword}
          className="password-form"
          onSubmit={(event) => {
            event.preventDefault();
            handlePassChange();
          }}
        >
          <label htmlFor="current-password">Current Password</label>
          <input
            id="current-password"
            type="password"
            className="password"
            value={currentPass}
            autoComplete="current-password"
            onChange={(e) => setCurrentPass(e.target.value)}
          />
          <label htmlFor="new-password">New Password</label>
          <input
            id="new-password"
            type="password"
            className="password"
            value={newPass}
            autoComplete="new-password"
            onChange={(e) => setNewPass(e.target.value)}
          />
          <label htmlFor="confirm-new-password">Confirm New Password</label>
          <input
            id="confirm-new-password"
            type="password"
            className="password"
            value={confirmNewPass}
            autoComplete="new-password"
            onChange={(e) => setConfirmNewPass(e.target.value)}
          />
          <button
            className="change-password-button"
            disabled={isChangingPassword}
            type="submit"
          >
            {isChangingPassword ? "Changing Password..." : "Change Password"}
          </button>
        </form>
      </div>
    </>
  );
};

export default Settings;
