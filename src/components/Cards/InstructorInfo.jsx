import { useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "../../api/axiosInstance";
import { DotsVerticalRounded } from "../../assets";
import Toast from "../Toast/Toast";

const InstructorInfo = ({
  data,
  setInstructors,
  isAdmin,
  setToastMessage,
  setToastType,
  setShowToast,
  toastMessage,
  toastType,
  showToast,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [instructorName, setInstructorName] = useState(data.name);

  const navigate = useNavigate();

  const handleInstructor = () => {
    navigate(`/instructor/${data.id}`);
  };

  const formatTime = (duration) => {
    if (duration < 60) {
      return `${duration} seconds`;
    } else if (duration < 3600) {
      const minutes = (duration / 60).toFixed(1);
      return `${minutes} Minutes`;
    } else if (duration < 86400) {
      const hours = (duration / 3600).toFixed(1);
      return `${hours} Hours`;
    } else {
      const days = (duration / 86400).toFixed(1);
      return `${days} Days`;
    }
  };

  const updateInstructorBackend = async (instructor) => {
    try {
      const response = await axios.post(
        "/api/admin/update-instructor",
        instructor,
        {
          withCredentials: true,
        }
      );
      return response;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const deleteInstructorBackend = async (id) => {
    try {
      const response = await axios.post(
        "/api/admin/delete-instructor",
        { instructorId: id },
        {
          withCredentials: true,
        }
      );
      return response;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const handleUpdateInstructor = async () => {
    setShowToast(false);
    if (instructorName.trim()) {
      try {
        const updatedInstructor = {
          name: instructorName.trim(),
          instructorId: data.id,
        };

        setToastType("warning");
        setToastMessage("Updating instructor");
        setShowToast(true);

        const instructor = await updateInstructorBackend(updatedInstructor);

        setToastType("success");
        setToastMessage("Instructor updated successfully");
        setShowToast(true);
        setIsModalOpen(false);
        setInstructors(instructor.data);
      } catch (error) {
        setToastType("error");
        setToastMessage("Failed to update instructor");
        setShowToast(true);
      }
    } else {
      setToastType("error");
      setToastMessage("Name can't be empty when updating instructor");
      setShowToast(true);
    }
  };

  const handleDeleteInstructor = async () => {
    setShowToast(false);
    try {
      setToastType("warning");
      setToastMessage("Deleting instructor");
      setShowToast(true);

      const instructor = await deleteInstructorBackend(data.id);

      setToastType("success");
      setToastMessage("Instructor deleted successfully");
      setShowToast(true);
      setIsDeleteModalOpen(false);
      setInstructors(instructor.data);
    } catch (error) {
      setToastType("error");
      setToastMessage("Failed to delete instructor");
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

      <div className="instructor-card">
        <div className="instructor-psuedo-div" onClick={handleInstructor}>
          <div className="img-container-instructor">
            <img
              src={data.photo ? data.photo : "/assets/placeholder.avif"}
              alt=""
            />
          </div>
          <div className="instructor-title">{data.name}</div>
          <div>Courses : {data.Courses}</div>
          <div>Duration : {formatTime(data.totalCourseDuration)}</div>

          {isAdmin && (
            <div
              className="edit-instructor"
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
            >
              <DotsVerticalRounded />
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal small-medium-modal">
            <div className="add-user-modal">
              <div className="modal-heading">Update Instructor</div>
              <input
                type="text"
                className="input"
                value={instructorName}
                onChange={(e) => setInstructorName(e.target.value)}
              />
              <div className="modal-buttons-group-user">
                <div
                  className="modal-buttons"
                  style={{
                    backgroundColor: "#00a6a6",
                    color: "white",
                    cursor: "pointer",
                  }}
                  onClick={handleUpdateInstructor}
                >
                  Update
                </div>
                <div
                  className="modal-buttons"
                  style={{
                    backgroundColor: "#e20044",
                    color: "white",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsDeleteModalOpen(true);
                  }}
                >
                  Delete
                </div>
                <div
                  className="modal-buttons"
                  style={{ color: "#45312d", cursor: "pointer" }}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal small-medium-modal">
            <div className="add-user-modal">
              <div className="modal-heading">Delete Confirmation</div>
              <p className="confirmation-dialog-small">
                Are you sure you want to delete "{data.name}"?
              </p>
              <div className="modal-buttons-group-user">
                <div
                  className="modal-buttons"
                  style={{
                    backgroundColor: "#e20044",
                    color: "white",
                    cursor: "pointer",
                  }}
                  onClick={handleDeleteInstructor}
                >
                  Yes
                </div>
                <div
                  className="modal-buttons"
                  style={{ color: "#45312d", cursor: "pointer" }}
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  No
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InstructorInfo;
