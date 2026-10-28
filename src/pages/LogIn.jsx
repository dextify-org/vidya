import { useState } from "react";
import Toast from "../components/Toast/Toast";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
const LogIn = () => {
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");

  const {
    isSubmitting,
    login,
    toastMessage,
    toastType,
    showToast,
    setShowToast,
  } = useAuth();

  const handleFinish = async () => {
    login({ username: usernameInput, password: passwordInput });
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

      <div className="login-container">
        <div className="login-inner">
          <div className="admin-setup">
            <div className="username-title">Log In</div>
          </div>
          <div className="input-container">
            <div className="username-label">Username</div>
            <div className="username-input">
              <input
                onChange={(e) => setUsernameInput(e.target.value)}
                value={usernameInput}
                type="text"
              />
            </div>
            <div className="password-label">Password</div>
            <div className="password-input">
              <input
                onChange={(e) => setPasswordInput(e.target.value)}
                value={passwordInput}
                type="password"
                name=""
                id=""
              />
            </div>
          </div>
          <div className="login-button-container" onClick={handleFinish}>
            <div className="glass-button">
              <AnimatePresence mode="wait">
                {isSubmitting ? (
                  // Spinner animation
                  <motion.svg
                    key="spinner"
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    viewBox="0 0 50 50"
                    style={{ width: 24, height: 24 }}
                    className="spinny"
                  >
                    <circle
                      cx="25"
                      cy="25"
                      r="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray="1, 60"
                    />
                  </motion.svg>
                ) : (
                  <motion.span
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ display: "flex", alignItems: "center" }}
                  >
                    Log In
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LogIn;
