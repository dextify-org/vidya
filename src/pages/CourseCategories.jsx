import Navbar from "../components/Navbar/Navbar";
import PreNav from "../components/Navbar/PreNav";
import Cards from "../components/Cards/Cards";
import { motion } from "framer-motion";
import Loader from "../components/Loader/Loader";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "../api/axiosInstance";

const CourseCategories = ({ category }) => {
  const [courses, setCourses] = useState(null);
  const [loading, setLoading] = useState(true);
  const { id } = useParams();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data } = await axios.post(
          "/api/category/course",
          { CategoryId: id },
          { withCredentials: true }
        );
        setCourses(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };

    fetchData();
  }, [id]);

  return (
    <>
      <PreNav name={courses && courses.category} />
      <Navbar navItem={category} />
      <motion.div
        key={id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, ease: "easeInOut" }}
        className="card-divs-wrap"
      >
        {loading && <Loader />}
        {!loading &&
          courses &&
          courses.courses.map((item, index) => (
            <Cards
              key={index}
              imgsrc={item?.photo}
              info={item.cleanedName}
              courseId={item.id}
            />
          ))}
      </motion.div>
    </>
  );
};

export default CourseCategories;
