import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "../api/axiosInstance.js";
import Toast from "../components/Toast/Toast";
import {
  ArrowBack,
  FileBlank,
  Folder,
  Hdd,
  ToLogo,
  WelcomeLogo,
  Plus,
  FolderMinusSolid,
} from "../assets";
const Welcome = () => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    transition={{ duration: 0.3 }}
    className="intro-container"
  >
    <div className="welcome">
      <WelcomeLogo />
    </div>
    <div className="to">
      <ToLogo />
    </div>
    <div className="vidya">VIDYA</div>
    <div className="server-tagline">A Media Server for video lectures</div>
    <div className="server-description">
      The word "Vidya", meaning "knowledge" or "learning," is used in multiple
      Indian languages. It's a common term with Sanskrit origins that has been
      adopted by many Indian languages
    </div>
  </motion.div>
);

const Username = ({
  usernameInput,
  setUsernameInput,
  passwordInput,
  setPasswordInput,
}) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    transition={{ duration: 0.3 }}
    className="username-container"
  >
    <div className="admin-setup">
      <div className="username-title">Create a Admin Username & Password</div>
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
  </motion.div>
);
const SelectedFolders = ({ selectedFolders, onAddFolder, onRemoveFolder }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, y: 20 }}
    transition={{ duration: 0.3 }}
    className="selected-folders-container"
  >
    <div className="folders-setup">
      <div className="folders-title">Add Folders to scan for courses</div>
    </div>
    <div className="folders-list">
      {selectedFolders.map((folder, index) => (
        <div key={index} className="selected-folder">
          <div className="folder-path">{folder}</div>
          <div onClick={() => onRemoveFolder(index)} className="remove-folder">
            <FolderMinusSolid />
          </div>
        </div>
      ))}
    </div>
    <div className="add-folder-button-wrap">
      <div onClick={onAddFolder} className="add-folder-button">
        <Plus />
        Add Folder
      </div>
    </div>
  </motion.div>
);
const FileBrowser = ({ onSelect }) => {
  const [currentPath, setCurrentPath] = useState("");
  const [items, setItems] = useState([]);
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [parentDirectory, setParentDirectory] = useState(null);

  const fetchDrives = async () => {
    try {
      setLoading(true);

      const response = await axios.get("/api/drive/drives");
      if (!response.status === 200) throw new Error("Failed to fetch drives");
      const { data } = response;
      setDrives(data);
      if (!currentPath && data.length > 0) {
        const firstAccessibleDrive = data.find((drive) => drive.accessible);
        if (firstAccessibleDrive) {
          fetchDirectory(firstAccessibleDrive.path);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDirectory = async (path) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(
        `/api/drive/browse?path=${encodeURIComponent(path)}`
      );

      if (!response.status === 200)
        throw new Error("Failed to fetch directory contents");

      const { data } = response;
      setItems(data.items);
      setCurrentPath(data.currentPath);
      setParentDirectory(data.parentDirectory);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (parentDirectory) {
      fetchDirectory(parentDirectory);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === null) return "N/A";
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 Bytes";
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + " " + sizes[i];
  };

  useEffect(() => {
    fetchDrives();
  }, []);
  return (
    <div className="drive-container">
      <div className="drive-setup">
        <div className="drive-title">Choose the Course directory</div>
      </div>
      <div className="drives">
        {drives.map((drive) => (
          <div
            key={drive.label}
            onClick={() => drive.accessible && fetchDirectory(drive.path)}
            className={`drive ${
              drive.accessible ? "accessible-drive" : "not-allowed-drive"
            }`}
          >
            <div className="drive-details">
              <div className="drive-icon">
                <Hdd />
              </div>
              <div className="drive-info">
                <div className="drive-label">{drive.label}</div>
                <div className="drive-path">{drive.path}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="current-path">Current Path - {currentPath}</div>
      {parentDirectory && (
        <div className="parent-directory" onClick={handleBack}>
          ...
        </div>
      )}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="folder-list">
          {items.map((item) => (
            <div
              key={item.path}
              className="items"
              onClick={() =>
                item.isDirectory ? fetchDirectory(item.path) : ""
              }
            >
              {item.isDirectory ? <Folder /> : <FileBlank />}
              <div className="item-lable">{item.name}</div>
              {!item.isDirectory && (
                <span className="item-size">{formatFileSize(item.size)}</span>
              )}
            </div>
          ))}
        </div>
      )}
      {error && <div className="error">{error}</div>}
      <div className="select-folder">
        <div
          onClick={() => {
            onSelect(currentPath);
          }}
        >
          Select
        </div>
      </div>
    </div>
  );
};

const FirstStartUp = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [selectedFolders, setSelectedFolders] = useState([]);
  const [isChoosingFolder, setIsChoosingFolder] = useState(false);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Completed successfully");
  const [toastType, setToastType] = useState("success");
  const tabs = [
    { title: "Welcome" },
    { title: "Username" },
    { title: "Selected Folders" },
  ];
  const handleHome = () => {
    window.location.href = "/";
    window.location.reload(true);
  };
  const handleNext = () => {
    if (currentTab < tabs.length - 1) setCurrentTab(currentTab + 1);
    if (currentTab === 1) setDirection(-1);
  };

  const handleBack = () => {
    if (isChoosingFolder) {
      setIsChoosingFolder(false);
    } else if (currentTab > 0) {
      setCurrentTab(currentTab - 1);
    }

    if (currentTab === 2) setDirection(1);
  };

  const handleAddFolder = () => {
    setIsChoosingFolder(true);
  };

  const handleFolderSelected = (path) => {
    if (selectedFolders.includes(path)) {
      setIsChoosingFolder(false);
      return;
    }
    setSelectedFolders([...selectedFolders, path]);
    setIsChoosingFolder(false);
  };

  const handleRemoveFolder = (index) => {
    setSelectedFolders(selectedFolders.filter((_, i) => i !== index));
  };
  const handleKey = () => {
    if (currentTab === 0) {
      return 1;
    } else if (currentTab === 1) {
      return 1;
    } else {
      return 2;
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);

    try {
      const response = await axios.post(
        "/api/admin/register",
        {
          username: usernameInput,
          password: passwordInput,
          folders: selectedFolders,
        },
        { withCredentials: true }
      );

      if (response.status === 200) {
        setIsSubmitting(false);
        setShowToast(true);
        setTimeout(() => {
          handleHome();
        }, 2000);
      }
    } catch (error) {
      setIsSubmitting(false);
      error.status === 400
        ? setToastMessage("cridentials can't be empty")
        : setToastMessage("error registering");
      setToastType("error");
      setShowToast(true);
    }
  };

  return (
    <div>
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          duration={3000}
          onClose={() => setShowToast(false)}
        />
      )}
      <div className="startup-wrap">
        <div className="first-startup-container">
          <AnimatePresence mode="wait">
            {!isChoosingFolder ? (
              <>
                {currentTab === 0 && <Welcome />}
                {currentTab === 1 && (
                  <Username
                    usernameInput={usernameInput}
                    setUsernameInput={setUsernameInput}
                    passwordInput={passwordInput}
                    setPasswordInput={setPasswordInput}
                  />
                )}
                {currentTab === 2 && (
                  <SelectedFolders
                    selectedFolders={selectedFolders}
                    onAddFolder={handleAddFolder}
                    onRemoveFolder={handleRemoveFolder}
                  />
                )}
              </>
            ) : (
              <FileBrowser onSelect={handleFolderSelected} />
            )}
          </AnimatePresence>
          <div className="setup-buttons">
            {(currentTab > 0 || isChoosingFolder) && (
              <div className="back-button" onClick={handleBack}>
                <ArrowBack /> Back
              </div>
            )}

            {!isChoosingFolder && (
              <motion.div
                className={`${
                  currentTab === 2 ? "finish-button" : "next-button"
                }`}
                onClick={currentTab === 2 ? handleFinish : handleNext}
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
                      key={handleKey()}
                      initial={{ x: direction * 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -direction * 20, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ display: "flex", alignItems: "center" }}
                    >
                      {currentTab === 2 ? "Finish" : "Next"}
                      <ArrowBack
                        style={{
                          transform:
                            currentTab === 2 ? "none" : "rotate(180deg)",
                          marginLeft: 8,
                        }}
                      />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirstStartUp;
