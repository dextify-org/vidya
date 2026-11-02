import { useState, useEffect, useCallback } from "react";
import Cards from "../components/Cards/Cards";
import Loader from "../components/Loader/Loader";
import axios from "../api/axiosInstance";
import PreNav from "../components/Navbar/PreNav";
import { motion } from "framer-motion";

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get("/api/course/", {
        withCredentials: true,
      });
      setCourses(data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch courses:", error);
      setError("Failed to load courses. Please try again later.");
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);
  return (
    <>
      <PreNav name="COURSES" />

      {loading && <Loader />}

      {error && <div className="error-message">{error}</div>}

      {!loading && courses && (
        <motion.div
          initial={{ opacity: 0, x: -200 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 200 }}
          className="card-divs-wrap"
        >
          {courses.map((item, index) => (
            <Cards
              key={item.id || index}
              imgsrc={item?.photo || "/assets/placeholder.avif"}
              info={item.cleanedName}
              courseId={item.id}
            />
          ))}
        </motion.div>
      )}
    </>
  );
};

export default Courses;
