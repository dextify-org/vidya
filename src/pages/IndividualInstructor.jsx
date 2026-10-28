import PreNav from "../components/Navbar/PreNav";
import { useParams } from "react-router-dom";
import { DotsVerticalRounded } from "../assets";
import Cards from "../components/Cards/Cards";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "../api/axiosInstance";
import Loader from "../components/Loader/Loader.jsx";
import Toast from "../components/Toast/Toast.jsx";
import { useAuth } from "../context/AuthContext";
const IndividualInstrucor = () => {
  const { id } = useParams();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [instructorsData, setInstructorsData] = useState([]);
  const [instructorTitle, setInstructorTitle] = useState("");
  const [instructorDescription, setInstructorDescription] = useState("");
  const [updateCounter, setUpdateCounter] = useState(0);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [role, setRole] = useState("");
  const {
    toastMessage,
    setToastMessage,
    toastType,
    setToastType,
    showToast,
    setShowToast,
  } = useAuth();
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data } = await axios.post(
          "/api/instructor/individual",
          { InstructorId: id },
          { withCredentials: true }
        );
        setInstructorsData(data);
        setInstructorTitle(data.name);
        setInstructorDescription(data.description || "");
        setRole(data.role);
        setLoading(false);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, [updateCounter]);
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
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };
  const handleUpload = async () => {
    const formData = new FormData();
    formData.append("InstructorId", id);

    formData.append("InstructorName", instructorTitle);
    if (instructorDescription) {
      formData.append("description", instructorDescription);
    }
    try {
      if (file) {
        formData.append("file", file);
        setToastType("progress");
        setToastMessage("uplaoding");
        setShowToast(true);
      }

      await axios.post("/api/admin/form/instructor", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        withCredentials: true,
      });
      setUpdateCounter((prev) => prev + 1);
      setToastType("success");
      setToastMessage("updated instructor");
      setShowToast(true);
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      setToastType("error");
      setToastMessage("error updating instructor");
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

      <PreNav name={instructorsData?.name} />
      {loading && <Loader />}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, x: -200 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 200 }}
        >
          <div className="course-instructor-info">
            <div className="course-instructor-info-container">
              <div className="top">
                <div className="top-container">
                  <div className="course-instructor-title">
                    {instructorsData?.name}
                    <div className="edit-information">
                      {role && role === "admin" && (
                        <div
                          style={{ cursor: "pointer" }}
                          className="svg-div"
                          onClick={openModal}
                        >
                          <DotsVerticalRounded />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bottom">
                <div className="bottom-container">
                  <div>Courses : {instructorsData?.courses?.length}</div>
                  <div className="description">
                    <span className="drop-cap">Description : </span>
                    {instructorsData?.description}
                  </div>
                  <div>
                    Duration: {formatTime(instructorsData?.totalCourseDuration)}
                  </div>
                </div>
              </div>
              <div className="img-container instructor-info-image">
                <img src={instructorsData?.photo} alt="" />
              </div>
            </div>
          </div>

          <div className="courses">Courses</div>

          <div className="card-divs-wrap">
            {instructorsData?.courses?.map((data) => (
              <Cards
                imgsrc={data.photo}
                info={data.cleanedName}
                courseId={data.id}
                key={data.id}
              />
            ))}
          </div>
        </motion.div>
      )}
      <AnimatePresence>
        {isModalOpen && (
          <div className="modal-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="modal big-modal"
            >
              <div className="edit-course-modal">
                <div className="edit-course-modal-inner">
                  <div className="modal-heading">Edit Instructor</div>
                  <div className="edit-course-form">
                    <div className="course-title-edit">
                      <div>Edit Title</div>
                      <div className="modal-input-course-edit">
                        <input
                          onChange={(e) => setInstructorTitle(e.target.value)}
                          className="input"
                          value={instructorTitle}
                          type="text"
                        />
                      </div>
                    </div>
                    <div className="course-title-edit">
                      <div>Edit Image</div>
                      <div className="modal-input-course-edit">
                        <input
                          className="input"
                          accept="image/*"
                          type="file"
                          onChange={handleFileChange}
                        />
                      </div>
                    </div>
                    <div className="course-title-edit">
                      <div>Edit Description</div>
                      <div className="modal-input-description-edit">
                        <textarea
                          onChange={(e) =>
                            setInstructorDescription(e.target.value)
                          }
                          value={instructorDescription}
                        ></textarea>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-buttons-group-user modal-buttons-group-edit-course">
                <motion.div
                  className="modal-buttons"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  style={{ color: "#00a6a6" }}
                  onClick={handleUpload}
                >
                  Save
                </motion.div>
                <motion.div
                  className="modal-buttons"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  style={{ color: "#45312d" }}
                  onClick={closeModal}
                >
                  Cancel
                </motion.div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default IndividualInstrucor;
