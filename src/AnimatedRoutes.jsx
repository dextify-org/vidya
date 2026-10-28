import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import CourseCategories from "./pages/CourseCategories";
import Player from "./pages/Player";
import Categories from "./pages/Categories";
import Instructor from "./pages/Instructor";
import Settings from "./pages/Settings";
import IndividualInstrucor from "./pages/IndividualInstructor";
import IndividualCourses from "./pages/IndividualCourses";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import LogIn from "./pages/LogIn";
import ProtectedRoute from "./components/ProtectedRoute";
import Courses from "./pages/Courses";
import { useAuth } from "./context/AuthContext";

const AnimatedRoutes = () => {
  const location = useLocation();
  const { category } = useAuth();
  return (
    <div className="main">
      <div className="container">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/login" element={<LogIn />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Home category={category} />} />
              <Route path="/courses" element={<Courses />} />
              <Route
                path="/category/:id"
                element={<CourseCategories category={category} />}
              />
              <Route path="/course/play/:id" element={<Player />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/instructor" element={<Instructor />} />
              <Route path="/settings/*" element={<Settings />} />
              <Route path="/instructor/:id" element={<IndividualInstrucor />} />
              <Route path="/courses/:id" element={<IndividualCourses />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>
          </Routes>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AnimatedRoutes;
