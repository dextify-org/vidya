import { AnimatePresence, motion } from "framer-motion";
import React, { useState, useEffect, useRef } from "react";
import axios from "../../api/axiosInstance.js";
import { useNavigate } from "react-router-dom";
import { SearchSolid } from "../../assets/index.jsx";

const Search = () => {
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState({
    lectures: [],
    courses: [],
    sections: [],
    instructors: [],
    categories: [],
  });
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const searchTimeout = useRef(null);
  const searchWrapperInnerRef = useRef(null);

  const performSearch = async (term) => {
    if (term.trim() === "") {
      setSearchResults({
        lectures: [],
        courses: [],
        sections: [],
        instructors: [],
        categories: [],
      });
      setShowResults(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get("/api/search", {
        params: {
          query: term,
          limit: 10,
        },
        withCredentials: true,
      });
      setSearchResults(response.data);
      setShowResults(true);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (searchTerm === "") {
      setSearchResults({
        lectures: [],
        courses: [],
        sections: [],
        instructors: [],
        categories: [],
      });
      setShowResults(false);
      return;
    }

    setIsLoading(true);
    searchTimeout.current = setTimeout(() => {
      performSearch(searchTerm);
    }, 500);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchTerm]);

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchWrapperInnerRef.current &&
        !searchWrapperInnerRef.current.contains(event.target)
      ) {
        setShowSearch(false);
      }
    };

    // Add event listener when search is shown
    if (showSearch) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Clean up event listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSearch]);

  const handleSearch = (event) => {
    const term = event.target.value;
    setSearchTerm(term);
  };

  const hasResults =
    searchResults.lectures?.length > 0 ||
    searchResults.courses?.length > 0 ||
    searchResults.sections?.length > 0 ||
    searchResults.instructors?.length > 0 ||
    searchResults.categories?.length > 0;

  return (
    <>
      <div className="search-placeholder" onClick={() => setShowSearch(true)}>
        <div style={{ marginLeft: "1rem", opacity: ".7" }}>
          Search courses, lectures, & more...
        </div>
        <svg
          className="search-icon"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M11 2C15.968 2 20 6.032 20 11C20 15.968 15.968 20 11 20C6.032 20 2 15.968 2 11C2 6.032 6.032 2 11 2ZM11 18C14.8675 18 18 14.8675 18 11C18 7.1325 14.8675 4 11 4C7.1325 4 4 7.1325 4 11C4 14.8675 7.1325 18 11 18ZM19.4853 18.0711L22.3137 20.8995L20.8995 22.3137L18.0711 19.4853L19.4853 18.0711Z"
            fill="#0A2463"
          />
        </svg>
      </div>
      <div
        className="search-placeholder-icon"
        onClick={() => setShowSearch(true)}
      >
        <SearchSolid />
      </div>
      {showSearch && (
        <div className="overlay">
          <div className="search-wrapper">
            <div className="search-wrapper-inner" ref={searchWrapperInnerRef}>
              <div className="search">
                <input
                  type="text"
                  className="search-input"
                  value={searchTerm}
                  onChange={handleSearch}
                  placeholder="Search courses, lectures, & more..."
                  autoFocus
                />
                <svg
                  className="search-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M11 2C15.968 2 20 6.032 20 11C20 15.968 15.968 20 11 20C6.032 20 2 15.968 2 11C2 6.032 6.032 2 11 2ZM11 18C14.8675 18 18 14.8675 18 11C18 7.1325 14.8675 4 11 4C7.1325 4 4 7.1325 4 11C4 14.8675 7.1325 18 11 18ZM19.4853 18.0711L22.3137 20.8995L20.8995 22.3137L18.0711 19.4853L19.4853 18.0711Z"
                    fill="#0A2463"
                  />
                </svg>
              </div>
              <AnimatePresence>
                {showResults && hasResults && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                    }}
                    className="search-results"
                  >
                    {searchResults.courses &&
                      searchResults.courses.length > 0 && (
                        <div className="result-section">
                          <div className="result-heading">Courses</div>
                          {searchResults.courses.map((course) => (
                            <div
                              key={course.id}
                              className="search-results-list"
                              onClick={() => navigate(`/courses/${course.id}`)}
                            >
                              <div className="result-item">
                                <span className="result-name">
                                  {course.name}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    {searchResults.lectures &&
                      searchResults.lectures.length > 0 && (
                        <div className="result-section">
                          <div className="result-heading">Lectures</div>
                          {searchResults.lectures.map((lecture) => (
                            <div
                              key={lecture.id}
                              className="search-results-list"
                              onClick={() => {
                                navigate(`/course/play/${lecture.courseId}`, {
                                  state: lecture.id,
                                });
                                setShowResults(false);
                              }}
                            >
                              <div className="result-item">
                                <span className="result-name">
                                  {lecture.name}
                                </span>
                                <div className="result-details">
                                  <span className="course-reference">
                                    {lecture.courseName &&
                                      `in ${lecture.courseName}`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    {searchResults.sections &&
                      searchResults.sections.length > 0 && (
                        <div className="result-section">
                          <div className="result-heading">Sections</div>
                          {searchResults.sections.map((section) => (
                            <div
                              key={section.id}
                              className="search-results-list"
                              onClick={() => {
                                navigate(`/courses/${section.courseId}`, {
                                  state: section.id,
                                });
                                setShowResults(false);
                              }}
                            >
                              <div className="result-item">
                                <span className="result-name">
                                  {section.name}
                                </span>
                                {section.courseName && (
                                  <div className="result-details">
                                    <span className="course-reference">
                                      in {section.courseName}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    {searchResults.instructors &&
                      searchResults.instructors.length > 0 && (
                        <div className="result-section">
                          <div className="result-heading">Instructors</div>
                          {searchResults.instructors.map((instructor) => (
                            <div
                              key={instructor.id}
                              className="search-results-list"
                              onClick={() => {
                                navigate(`/instructor/${instructor.id}`, {
                                  state: instructor.id,
                                });
                                setShowResults(false);
                              }}
                            >
                              <div className="result-item">
                                <span className="result-name">
                                  {instructor.name}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    {searchResults.categories &&
                      searchResults.categories.length > 0 && (
                        <div className="result-section">
                          <div className="result-heading">Categories</div>
                          {searchResults.categories.map((category) => (
                            <div
                              key={category.id}
                              className="search-results-list"
                              onClick={() => {
                                navigate(`/category/${category.id}`);
                                setShowResults(false);
                              }}
                            >
                              <div className="result-item">
                                <span className="result-name">
                                  {category.name}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    {!isLoading && !hasResults && (
                      <div className="no-results">
                        <span>No results found for "{searchTerm}"</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Search;
