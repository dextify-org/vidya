import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Toast from "../Toast/Toast";
import {
  DotsVerticalRounded,
  FolderMinusSolid,
  FolderPlusSolid,
  Plus,
  Refresh,
  Hdd,
  Folder,
  FileBlank,
} from "../../assets";
import axios from "../../api/axiosInstance";

const Admin = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [action, setAction] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  const [inputValue, setInputValue] = useState(null);
  const [inputValuePass, setInputValuePass] = useState(null);
  const [adminData, setAdminData] = useState(null);
  const [selectedFolders, setSelectedFolders] = useState([]);
  const [isChoosingFolder, setIsChoosingFolder] = useState(false);
  const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState(false);
  const [folderDelete, setFolderDelete] = useState(null);
  const [folderDeleteModal, setFolderDeleteModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Completed successfully");
  const [toastType, setToastType] = useState("success");

  useEffect(() => {
    setShowConfirmation(false);
  }, [activeTab]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await axios.get("/api/admin/admin", {
          withCredentials: true,
        });
        setAdminData(data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, []);

  const openModal = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
    setInputValue(user.username);
  };
  const handleUserChangeByAdmin = async () => {
    setShowToast(false);

    if (!inputValue && !inputValuePass) {
      setToastType("error");
      setToastMessage(
        "Please provide either a new username or password to update"
      );
      setShowToast(true);
      return;
    }

    if (inputValue !== null && inputValue.length < 5) {
      setToastType("error");
      setToastMessage("Username must be at least 5 characters long");
      setShowToast(true);
      return;
    }

    if (inputValuePass !== null && inputValuePass.length < 8) {
      setToastType("error");
      setToastMessage("Password must be at least 8 characters long");
      setShowToast(true);
      return;
    }

    const updateData = {};
    if (inputValue) updateData.username = inputValue;
    if (inputValuePass) updateData.password = inputValuePass;
    updateData.id = selectedUser.id;

    try {
      const response = await axios.post("/api/admin/update-user", updateData, {
        withCredentials: true,
      });

      setToastType("success");

      if (inputValue && inputValuePass) {
        setToastMessage("Username and password updated successfully");
      } else if (inputValue) {
        setToastMessage("Username updated successfully");
      } else {
        setToastMessage("Password updated successfully");
      }
      const { data } = await axios.get("/api/admin/admin", {
        withCredentials: true,
      });

      setAdminData(data);
      setShowToast(true);
      setInputValue(null);
      setInputValuePass(null);
      closeModal();
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to update user";
      setToastType("error");
      setToastMessage(errorMessage);
      setShowToast(true);
      console.error("User update error:", error);
    }
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setShowConfirmation(false);
    setActiveTab("profile");
  };

  const openAddUserModal = () => {
    setIsAddUserModalOpen(true);
  };

  const closeAddUserModal = () => {
    setIsAddUserModalOpen(false);
    setNewUserName("");
  };

  const openAddFolderModal = () => {
    setIsAddFolderModalOpen(true);
  };

  const closeAddFolderModal = () => {
    setIsAddFolderModalOpen(false);
  };

  const makeAdmin = async (user) => {
    setShowToast(false);

    try {
      const response = await axios.post(
        "/api/admin/promote-user",
        {
          userId: user.id,
        },
        { withCredentials: true }
      );

      setToastType("success");
      setToastMessage("User has been successfully promoted to admin");
      setShowToast(true);
      const { data } = await axios.get("/api/admin/admin", {
        withCredentials: true,
      });

      setAdminData(data);
      closeModal();
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to promote user to admin";
      setToastType("error");
      setToastMessage(errorMessage);
      setShowToast(true);
      console.error("Admin promotion error:", error);
    }
  };

  const removeUser = async (user) => {
    setShowToast(false);

    try {
      const response = await axios.post(
        "/api/admin/remove-user/",
        { userId: user.id },
        { withCredentials: true }
      );

      setToastType("success");
      setToastMessage("User has been successfully removed");
      setShowToast(true);
      const { data } = await axios.get("/api/admin/admin", {
        withCredentials: true,
      });

      setAdminData(data);
      closeModal();
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to remove user";
      setToastType("error");
      setToastMessage(errorMessage);
      setShowToast(true);
      console.error("User removal error:", error);
    }
  };

  const addUser = async () => {
    setShowToast(false);

    if (!newUserName.trim()) {
      setToastType("error");
      setToastMessage("Username is required");
      setShowToast(true);
      return;
    }

    if (!newUserPassword || newUserPassword.length < 8) {
      setToastType("error");
      setToastMessage("Password must be at least 8 characters long");
      setShowToast(true);
      return;
    }

    if (newUserName.trim().length < 5) {
      setToastType("error");
      setToastMessage("Username must be at least 5 characters long");
      setShowToast(true);
      return;
    }

    try {
      const response = await axios.post(
        "/api/admin/add-user",
        {
          username: newUserName.trim(),
          password: newUserPassword,
        },
        { withCredentials: true }
      );

      setToastType("success");
      setToastMessage("User has been successfully added");
      setShowToast(true);
      const { data } = await axios.get("/api/admin/admin", {
        withCredentials: true,
      });

      setAdminData(data);
      setNewUserName("");
      setNewUserPassword("");
      closeAddUserModal();
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to add user";
      setToastType("error");
      setToastMessage(errorMessage);
      setShowToast(true);
      console.error("Add user error:", error);
    }
  };

  const handleAction = (actionType) => {
    setAction(actionType);
    setShowConfirmation(true);
  };

  const handleFolderSelected = (path) => {
    if (selectedFolders.includes(path)) {
      setIsChoosingFolder(false);
      return;
    }
    setSelectedFolders([...selectedFolders, path]);
    setIsChoosingFolder(false);
  };

  const handleRemoveFolder = (folderPath) => {
    setSelectedFolders(selectedFolders.filter((path) => path !== folderPath));
  };

  const saveSelectedFolders = async () => {
    try {
      setToastType("warning");
      setToastMessage("adding folders");
      setShowToast(true);
      await axios.post(
        "/api/admin/folders",
        {
          folders: selectedFolders,
        },
        {
          withCredentials: true,
        }
      );
      const { data } = await axios.get("/api/admin/admin", {
        withCredentials: true,
      });

      setAdminData(data);
      closeAddFolderModal();
      setToastType("success");
      setToastMessage("folders added");
      setShowToast(true);
      setTimeout(handleScan, 1000);
    } catch (error) {
      console.error("Error saving folders:", error);
      setToastType("error");
      setToastMessage("error adding folders");
      setShowToast(true);
    }
  };
  const handleScan = async () => {
    try {
      setToastType("warning");
      setToastMessage("scanning folders");
      setShowToast(true);
      setIsScanning(true);
      await axios.post("/api/admin/scan", {}, { withCredentials: true });
      setToastType("success");
      setToastMessage("folders scanned");
      setShowToast(true);
      setIsScanning(false);
    } catch (error) {
      console.error(error);
      setToastType("error");
      setToastMessage("error scanning");
      setShowToast(true);
      setIsScanning(false);
    }
  };

  const handleFolderDeleteModal = (item) => {
    setFolderDelete(item);
    setFolderDeleteModal(true);
  };
  const handleFolderDelete = async () => {
    try {
      setToastType("warning");
      setToastMessage("deleting folder");
      setShowToast(true);
      await axios.post(
        "/api/admin/folderdelete",
        { folderId: folderDelete.id },
        { withCredentials: true }
      );
      const { data } = await axios.get("/api/admin/admin", {
        withCredentials: true,
      });

      setAdminData(data);
      setFolderDeleteModal(false);
      setToastType("success");
      setToastMessage("folders deleted");
      setShowToast(true);
    } catch (error) {
      console.error(error);
      setToastType("error");
      setToastMessage("error deleting folder");
      setShowToast(true);
    }
  };
  const confirmAction = () => {
    if (action === "make admin") {
      makeAdmin(selectedUser);
    } else if (action === "remove") {
      removeUser(selectedUser);
    }
    setShowConfirmation(false);
  };

  const cancelAction = () => {
    setShowConfirmation(false);
  };

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "admin", label: "Admin" },
  ];

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
        const response = await axios.get("/api/drive/drives", {
          withCredentials: true,
        });
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
          `/api/drive/browse?path=${encodeURIComponent(path)}`,
          { withCredentials: true }
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
      <div className="drive-container-admin">
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
        <div
          className="select-folder"
          style={{ justifyContent: "space-around" }}
        >
          <div
            onClick={() => {
              onSelect(currentPath);
            }}
          >
            Select
          </div>
          <div onClick={() => setIsChoosingFolder(false)}>Close</div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="modal-profile">
            <div className="modal-heading">{selectedUser.name}</div>
            <label htmlFor="">Username</label>
            <input
              type="text"
              className="input"
              onChange={(e) => setInputValue(e.target.value)}
              value={inputValue}
            />
            <label htmlFor="">Password</label>
            <input
              className="input"
              onChange={(e) => setInputValuePass(e.target.value)}
              value={inputValuePass}
              type="password"
            />
            <motion.div
              className="modal-buttons"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              style={{ color: "#00a6a6" }}
              onClick={handleUserChangeByAdmin}
            >
              Save
            </motion.div>
          </div>
        );
      case "admin":
        return (
          <>
            <div className="user-edit-title">{selectedUser.name}</div>
            <div className="modal-action-button">
              <motion.div
                className="modal-buttons"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                style={{ color: "#00a6a6" }}
                onClick={() => handleAction("make admin")}
              >
                Make Admin
              </motion.div>
              <motion.div
                className="modal-buttons"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                style={{ color: "#e20044" }}
                onClick={() => handleAction("remove")}
              >
                Remove User
              </motion.div>
            </div>
            {showConfirmation && (
              <div className="confirmation-popup">
                <p className="confirmation-message">
                  Are you sure you want to {action} {selectedUser?.name}?
                </p>
                <div className="confirmation-buttons">
                  <motion.div
                    className="modal-buttons"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      color: action === "make admin" ? "#00a6a6" : "#e20044",
                    }}
                    onClick={confirmAction}
                  >
                    Yes
                  </motion.div>
                  <motion.div
                    className="modal-buttons"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    style={{ color: "#0a2463" }}
                    onClick={cancelAction}
                  >
                    No
                  </motion.div>
                </div>
              </div>
            )}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="settings-content">
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          duration={3000}
          onClose={() => setShowToast(false)}
        />
      )}
      <div className="settings-title">Admin Settings</div>
      <div className="folders-title">Folders</div>
      {adminData &&
        adminData.folders.map((item) => (
          <div className="folder-div" key={item.id}>
            <div className="folder-name-div">{item.directory}</div>
            <span onClick={() => handleFolderDeleteModal(item)}>
              <FolderMinusSolid />
            </span>
          </div>
        ))}
      {folderDeleteModal && (
        <div className="modal-overlay">
          <div className="modal small-modal">
            <div className="confiramation-dialog">
              <div className="dialog-message">
                Are you sure want to delete :
              </div>
              <div className="dialog-directory">{folderDelete.directory}</div>
            </div>
            <div className="confiramtion-button-group">
              <div className="yes-button" onClick={handleFolderDelete}>
                Yes
              </div>
              <div
                className="cancel-button"
                onClick={() => setFolderDeleteModal(false)}
              >
                Cancel
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="folders-action-group">
        <div style={{ cursor: "pointer" }} onClick={openAddFolderModal}>
          Add Folder
          <div className="svg-div folder-plus">
            <FolderPlusSolid />
          </div>
        </div>
        <div style={{ cursor: "pointer" }} onClick={handleScan}>
          Scan Folders
          <div
            className={`svg-div folder-refresh ${isScanning ? "rotating" : ""}`}
          >
            <Refresh />
          </div>
        </div>
      </div>
      <div className="users-title">
        Users
        <div
          title="Add User"
          onClick={openAddUserModal}
          className="svg-div icon-plus"
        >
          <Plus />
        </div>
      </div>
      <div className="user-list">
        {adminData?.users?.map((user) => (
          <div key={user.id} className="user-item">
            <div className="user-info">{user.username}</div>
            <div
              className="svg-div"
              title="Edit User"
              onClick={() => openModal(user)}
            >
              <DotsVerticalRounded />
            </div>
          </div>
        ))}
        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="tabs-container">
                <div className="tabs">
                  {tabs.map((tab) => (
                    <div
                      key={tab.id}
                      className={`tab ${
                        activeTab === tab.id ? "active-tab" : ""
                      }`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                    </div>
                  ))}
                </div>
                <div className="tab-content">{renderTabContent()}</div>
              </div>
              <motion.div
                className="modal-buttons"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                style={{ color: "#45312d", marginTop: "1rem" }}
                onClick={closeModal}
              >
                Close
              </motion.div>
            </div>
          </div>
        )}
        {isAddUserModalOpen && (
          <div className="modal-overlay">
            <div className="modal medium-modal">
              <div className="add-user-modal">
                <div className="modal-heading">Add New User</div>
                <label htmlFor="">username</label>
                <input
                  className="input"
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  autoFocus
                />
                <label htmlFor="">password</label>
                <input
                  className="input"
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                />
                <div className="modal-buttons-group-user">
                  <motion.div
                    className="modal-buttons"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    style={{ color: "#00a6a6" }}
                    onClick={addUser}
                  >
                    Add User
                  </motion.div>
                  <motion.div
                    className="modal-buttons"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    style={{ color: "#45312d" }}
                    onClick={closeAddUserModal}
                  >
                    Cancel
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        )}
        {isAddFolderModalOpen && (
          <div className="modal-overlay">
            <div className="add-folder-modal">
              {isChoosingFolder ? (
                <FileBrowser onSelect={handleFolderSelected} />
              ) : (
                <>
                  <div className="selected-folders-container">
                    <div className="folders-setup">
                      <div className="folders-title">
                        Add Folders to scan for courses
                      </div>
                    </div>
                    <div className="folders-list">
                      {selectedFolders.map((folder, index) => (
                        <div key={index} className="selected-folder">
                          <div className="folder-path">{folder}</div>
                          <div
                            onClick={() => handleRemoveFolder(folder)}
                            className="remove-folder"
                          >
                            <FolderMinusSolid />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="add-folder-button-wrap">
                      <div
                        onClick={() => setIsChoosingFolder(true)}
                        className="add-folder-button"
                      >
                        <Plus />
                        Add Folder
                      </div>
                    </div>
                  </div>

                  <div className="folder-actions">
                    <div
                      className="save-cancel-folder-buttons"
                      onClick={saveSelectedFolders}
                    >
                      Save Folders
                    </div>

                    <div
                      className="save-cancel-folder-buttons"
                      onClick={closeAddFolderModal}
                    >
                      Cancel
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
