import PreNav from "../components/Navbar/PreNav";
import InstructorInfo from "../components/Cards/InstructorInfo";
import { useEffect, useState } from "react";
import axios from "../api/axiosInstance";
import { Plus } from "../assets";
import Toast from "../components/Toast/Toast";
import Loader from "../components/Loader/Loader";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
const Instructor = () => {
  const [instructors, setInstructors] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Completed successfully");
  const [toastType, setToastType] = useState("success");
  const [newInstructorInput, setNewInstructorInput] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [instructorNeedsUpdate, setInstructorNeedsUpdate] = useState(1);
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  useEffect(() => {
    const fetchInstructor = async () => {
      try {
        setIsLoading(true);
        const { data } = await axios.get("/api/instructor", {
          withCredentials: true,
        });
        setInstructors(data);
        setIsLoading(false);
      } catch (error) {
        console.error(error);
      }
    };
    fetchInstructor();
  }, [instructorNeedsUpdate]);
  const addInstructorBackend = async (instructor) => {
    try {
      const instructors = await axios.post(
        "/api/admin/instructor",
        instructor,
        {
          withCredentials: true,
        }
      );
      return instructors;
    } catch (error) {
      console.error(error);
    }
  };
  const handleAddInstructor = async () => {
    setShowToast(false);
    if (newInstructorInput.trim()) {
      const newInstructor = {
        name: newInstructorInput.trim(),
      };
      setToastType("warning");
      setToastMessage("adding instructor");
      setShowToast(true);
      const insctructor = await addInstructorBackend(newInstructor);
      setInstructorNeedsUpdate(instructorNeedsUpdate + 1);
      setNewInstructorInput("");
      setToastType("success");
      setToastMessage("instructor added");
      setShowToast(true);
      setIsModalOpen(false);
    } else {
      setToastType("error");
      setToastMessage("name can't be empty when adding instructor");
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
      <PreNav name={"INSTRUCTOR"} />
      {isLoading && <Loader />}

      {!isLoading && (
        <div className="instructor-container">
          {isAdmin && (
            <div className="instructor-card">
              <div
                className="instructor-psuedo-div"
                onClick={() => setIsModalOpen(true)}
              >
                <div className="add-instructor">
                  <div className="instructor-title">Add New Instructor</div>

                  <Plus />
                </div>
              </div>
            </div>
          )}
          {isModalOpen && (
            <div className="modal-overlay">
              <div className="modal small-modal">
                <div className="add-user-modal">
                  <div className="modal-heading">Add new Instructor</div>
                  <input
                    type="text"
                    className="input"
                    value={newInstructorInput}
                    onChange={(e) => setNewInstructorInput(e.target.value)}
                  />
                  <div className="modal-buttons-group-user">
                    <motion.div
                      className="modal-buttons"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      style={{ color: "#00a6a6" }}
                      onClick={handleAddInstructor}
                    >
                      Add
                    </motion.div>
                    <motion.div
                      className="modal-buttons"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      style={{ color: "#45312d" }}
                      onClick={() => setIsModalOpen(false)}
                    >
                      Cancel
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {instructors.map((data) => (
            <InstructorInfo
              data={data}
              key={data.id}
              setInstructors={setInstructors}
              isAdmin={isAdmin}
              setShowToast={setShowToast}
              showToast={showToast}
              setToastMessage={setToastMessage}
              toastMessage={toastMessage}
              setToastType={setToastType}
              toastType={toastType}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Instructor;
