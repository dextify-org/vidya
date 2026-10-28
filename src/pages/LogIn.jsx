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
        <form
          aria-busy={isSubmitting}
          className="login-inner"
          onSubmit={(event) => {
            event.preventDefault();
            handleFinish();
          }}
        >
          <div className="admin-setup">
            <div className="username-title">Log In</div>
          </div>
          <div className="input-container">
            <label className="username-label" htmlFor="login-username">
              Username
            </label>
            <div className="username-input">
              <input
                autoComplete="username"
                id="login-username"
                onChange={(e) => setUsernameInput(e.target.value)}
                value={usernameInput}
                type="text"
              />
            </div>
            <label className="password-label" htmlFor="login-password">
              Password
            </label>
            <div className="password-input">
              <input
                autoComplete="current-password"
                id="login-password"
                onChange={(e) => setPasswordInput(e.target.value)}
                value={passwordInput}
                type="password"
              />
            </div>
          </div>
          <div className="login-button-container">
            <button
              className="glass-button"
              disabled={isSubmitting}
              type="submit"
            >
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
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default LogIn;
