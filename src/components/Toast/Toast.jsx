import { useEffect, useState } from "react";
import "./Toast.css";
import {
  CheckCircleSolid,
  ErrorCircleSolid,
  HourGlassSolid,
  XCircleSolid,
} from "../../assets";

const Toast = ({ message, type = "success", duration = 3000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsVisible(false);
    onClose();
  };

  return isVisible ? (
    <div
      aria-atomic="true"
      aria-live={type === "error" ? "assertive" : "polite"}
      onMouseEnter={() => setShowButton(true)}
      onMouseLeave={() => setShowButton(false)}
      className={`toast animate-in`}
      role={type === "error" ? "alert" : "status"}
    >
      <span className={`toast-icon ${type}`}>
        {type === "success" && <CheckCircleSolid />}
        {type === "warning" && <ErrorCircleSolid />}
        {type === "error" && <XCircleSolid />}
        {type === "progress" && <HourGlassSolid />}
      </span>
      <span>{message}</span>

      <button
        aria-label="Dismiss notification"
        className={`close-btn${showButton ? " is-visible" : ""}`}
        onClick={handleClose}
        type="button"
      >
        ×
      </button>
    </div>
  ) : null;
};

export default Toast;
