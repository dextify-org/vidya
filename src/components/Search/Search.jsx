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
  const searchTriggerRef = useRef(null);

  const openSearch = () => {
    searchTriggerRef.current = document.activeElement;
    setShowSearch(true);
  };

  const closeSearch = () => {
    setShowSearch(false);
    requestAnimationFrame(() => searchTriggerRef.current?.focus());
  };

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
        closeSearch();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeSearch();
      }
    };

    if (showSearch) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showSearch]);

  useEffect(() => {
    if (!showSearch) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
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
      <button
        aria-label="Open search"
        className="search-placeholder"
        onClick={openSearch}
        type="button"
      >
        <span className="search-placeholder-label">
          Search courses, lectures, & more...
        </span>
        <span className="search-icon">
          <SearchSolid />
        </span>
      </button>
      <button
        aria-label="Open search"
        className="search-placeholder-icon"
        onClick={openSearch}
        type="button"
      >
        <SearchSolid />
      </button>
      {showSearch && (
        <div className="overlay" role="presentation">
          <div className="search-wrapper">
            <div
              aria-label="Search"
              aria-modal="true"
              className="search-wrapper-inner"
              ref={searchWrapperInnerRef}
              role="dialog"
            >
              <div className="search">
                <label className="visually-hidden" htmlFor="global-search">
                  Search courses, lectures, and more
                </label>
                <input
                  aria-controls="global-search-results"
                  aria-expanded={showResults && hasResults}
                  aria-haspopup="listbox"
                  aria-label="Search courses, lectures, and more"
                  autoComplete="off"
                  autoFocus
                  id="global-search"
                  role="combobox"
                  type="text"
                  className="search-input"
                  value={searchTerm}
                  onChange={handleSearch}
                  placeholder="Search courses, lectures, & more..."
                />
                <span className="search-icon">
                  <SearchSolid />
                </span>
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
                    id="global-search-results"
                    role="listbox"
                  >
                    {searchResults.courses &&
                      searchResults.courses.length > 0 && (
                        <div className="result-section">
                          <div className="result-heading">Courses</div>
                          {searchResults.courses.map((course) => (
                            <button
                              key={course.id}
                              className="search-results-list"
                              onClick={() => {
                                navigate(`/courses/${course.id}`);
                                closeSearch();
                              }}
                              role="option"
                              type="button"
                            >
                              <div className="result-item">
                                <span className="result-name">
                                  {course.name}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    {searchResults.lectures &&
                      searchResults.lectures.length > 0 && (
                        <div className="result-section">
                          <div className="result-heading">Lectures</div>
                          {searchResults.lectures.map((lecture) => (
                            <button
                              key={lecture.id}
                              className="search-results-list"
                              onClick={() => {
                                navigate(`/course/play/${lecture.courseId}`, {
                                  state: lecture.id,
                                });
                                closeSearch();
                              }}
                              role="option"
                              type="button"
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
                            </button>
                          ))}
                        </div>
                      )}
                    {searchResults.sections &&
                      searchResults.sections.length > 0 && (
                        <div className="result-section">
                          <div className="result-heading">Sections</div>
                          {searchResults.sections.map((section) => (
                            <button
                              key={section.id}
                              className="search-results-list"
                              onClick={() => {
                                navigate(`/courses/${section.courseId}`, {
                                  state: section.id,
                                });
                                closeSearch();
                              }}
                              role="option"
                              type="button"
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
                            </button>
                          ))}
                        </div>
                      )}
                    {searchResults.instructors &&
                      searchResults.instructors.length > 0 && (
                        <div className="result-section">
                          <div className="result-heading">Instructors</div>
                          {searchResults.instructors.map((instructor) => (
                            <button
                              key={instructor.id}
                              className="search-results-list"
                              onClick={() => {
                                navigate(`/instructor/${instructor.id}`, {
                                  state: instructor.id,
                                });
                                closeSearch();
                              }}
                              role="option"
                              type="button"
                            >
                              <div className="result-item">
                                <span className="result-name">
                                  {instructor.name}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    {searchResults.categories &&
                      searchResults.categories.length > 0 && (
                        <div className="result-section">
                          <div className="result-heading">Categories</div>
                          {searchResults.categories.map((category) => (
                            <button
                              key={category.id}
                              className="search-results-list"
                              onClick={() => {
                                navigate(`/category/${category.id}`);
                                closeSearch();
                              }}
                              role="option"
                              type="button"
                            >
                              <div className="result-item">
                                <span className="result-name">
                                  {category.name}
                                </span>
                              </div>
                            </button>
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
