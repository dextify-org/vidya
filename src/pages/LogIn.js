import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Toast from "../components/Toast/Toast";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import axios from "../api/axiosInstance.js";

const oidcErrors = {
  oidc_no_account: "No VIDYA account exists for this user",
  oidc_conflict: "This username is linked to another SSO account",
  oidc_no_username: "The identity provider did not return a username",
};

const LogIn = () => {
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authConfig, setAuthConfig] = useState({ localLoginEnabled: true });
  const [searchParams] = useSearchParams();
  const ssoError = searchParams.get("error");
  const [showSsoError, setShowSsoError] = useState(Boolean(ssoError));

  useEffect(() => {
    axios
      .get("/api/auth/config")
      .then(({ data }) => setAuthConfig(data))
      .catch((error) => console.error(error));
  }, []);

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
      {showSsoError && (
        <Toast
          message={oidcErrors[ssoError] || "SSO login failed"}
          type="error"
          duration={3000}
          onClose={() => setShowSsoError(false)}
        />
      )}
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
          {authConfig.localLoginEnabled && (
            <>
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
            </>
          )}
          {authConfig.oidcEnabled && (
            <a
              href="/api/auth/oidc/login"
              className="login-button-container"
              style={{
                display: "block",
                marginTop: "0.75rem",
                textDecoration: "none",
              }}
            >
              <div className="glass-button">{authConfig.oidcButtonLabel}</div>
            </a>
          )}
        </div>
      </div>
    </>
  );
};

export default LogIn;
