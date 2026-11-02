import PreNav from "../components/Navbar/PreNav";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import axios from "../api/axiosInstance.js";
import Loader from "../components/Loader/Loader.jsx";
import {
  DotsVerticalRounded,
  Plus,
  TrashAltSolid,
  PlusCircle,
  X,
  ChevronRight,
  VideoSolid,
  FilePdfSolid,
  Html,
  World,
  FileArchiveSolid,
  FileBlankSolid,
  Play,
  PinSolid,
} from "../assets";
import {
  useRef,
  useState,
  useEffect,
  memo,
  useCallback,
  useLayoutEffect,
} from "react";
import Toast from "../components/Toast/Toast.jsx";
import { useAuth } from "../context/AuthContext.jsx";
const ICON_MAP = {
  video: <VideoSolid />,
  pdf: <FilePdfSolid />,
  zip: <FileArchiveSolid />,
  html: <Html />,
  url: <World />,
};
const LectureTypeIcon = memo(({ type }) => {
  return ICON_MAP[type.toLowerCase()] || <FileBlankSolid />;
});
const secondsToMinutesRounded = (seconds) => {
  const minutes = (seconds / 60).toFixed(1);
  return `${minutes}min`;
};
const SectionHeader = memo(
  ({
    sectionOrder,
    title,
    hasLectures,
    isExpanded,
    onToggle,
    duration,
    total,
    sectionRef,
    sectionId,
    referalData,
  }) => (
    <div
      onClick={onToggle}
      className={`section-header ${
        sectionId === referalData ? "blink-background" : ""
      }`}
      ref={(e) => (sectionRef.current[sectionId] = e)}
    >
      <div className="section-title-wrap">
        <span className="playlist-section-title">
          {sectionOrder}: {title}
        </span>
        <div className="section-details">
          <span className="section-duration">
            {secondsToMinutesRounded(duration)}
          </span>
          <span className="section-lectures-total"> {total} lectures</span>
        </div>
      </div>
      {hasLectures && (
        <span className={`chevron-icon ${isExpanded ? "expanded" : ""}`}>
          <div className="svg-div">
            <ChevronRight />
          </div>
        </span>
      )}
    </div>
  )
);

const LectureItem = memo(
  ({
    lectureId,
    title,
    lectureOrder,
    sectionOrder,
    courseId,
    type,
    duration,
    content,
    setToastMessage,
    setToastType,
    setShowToast,
    onLectureClick,
    courseName,
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isTagModalOpen, setIsTagModalOpen] = useState(false);

    const toggleDropdown = () => setIsOpen(!isOpen);
    const toggleMenu = (e) => {
      e.stopPropagation();
      if (isTagModalOpen) {
        setIsTagModalOpen(false);
        setIsMenuOpen(false);
      } else {
        setIsMenuOpen(!isMenuOpen);
      }
    };

    const handleAddTag = (e) => {
      e.stopPropagation();
      setIsTagModalOpen(true);
      setIsMenuOpen(false);
    };

    const handleAddBookmark = async (e) => {
      e.stopPropagation();
      try {
        await axios.post(
          "/api/course/tagsandbookmark",
          {
            lectureId,
            name: title,
            type: "bookmark",
            courseId,
            courseName,
          },
          { withCredentials: true }
        );
        setToastMessage("lecture is bookmarked");
        setToastType("success");
        setShowToast(true);
      } catch (error) {
        console.error(error);
        if (error.status === 409) {
          setToastMessage("lecture is already bookmarked");
          setToastType("warning");
          setShowToast(true);
        }
      }
      setIsMenuOpen(false);
    };

    const handleTagSelection = async (tagType, e) => {
      e.stopPropagation();
      try {
        await axios.post(
          "/api/course/tagsandbookmark",
          {
            lectureId,
            name: title,
            type: tagType,
            courseId,
            courseName,
          },
          { withCredentials: true }
        );
        setToastMessage("lecture is tagged");
        setToastType("success");
        setShowToast(true);
      } catch (error) {
        console.error(error);
        if (error.status === 409) {
          setToastMessage("lecture is already tagged");
          setToastType("warning");
          setShowToast(true);
        }
      }
      setIsTagModalOpen(false);
    };

    return (
      <>
        <div
          className="playlist-lecture-item"
          onClick={() => onLectureClick(courseId, lectureId)}
        >
          <span className="checkbox">
            <div className="svg-div"></div>
          </span>
          <span className="type-icon">
            <div className="svg-div">
              <LectureTypeIcon type={type} />
            </div>
          </span>
          <div className="lecture-title">
            {sectionOrder}.{lectureOrder}: {title}
            <div className="lecture-content-time">
              <div className="lecture-time">
                {type === "video" && secondsToMinutesRounded(duration)}
              </div>
              {content?.[0]?.type && (
                <div className="lecture-content">
                  <button
                    className="content-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDropdown();
                    }}
                  >
                    <span>Content</span>
                    <svg
                      className="content-arrow"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="content-dropdown">
                      <span>
                        <LectureTypeIcon type={content?.[0]?.type} />
                      </span>
                      <a
                        href={"/api/course/content/" + content?.[0]?.pathId}
                        download
                        target="_blank"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        {content?.[0]?.originalName}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="lecture-menu">
            <div onClick={toggleMenu}>
              <DotsVerticalRounded />
            </div>

            {isMenuOpen && (
              <div className="lecture-menu-modal">
                <div className="menu-option" onClick={handleAddTag}>
                  Add as a tag
                </div>
                <div className="menu-option" onClick={handleAddBookmark}>
                  Add to bookmarks
                </div>
              </div>
            )}

            {isTagModalOpen && (
              <div className="tag-selection-modal">
                <div
                  className="tag-option"
                  data-tag="difficult"
                  onClick={(e) => handleTagSelection("difficult", e)}
                >
                  Difficult
                </div>
                <div
                  className="tag-option"
                  data-tag="need-review"
                  onClick={(e) => handleTagSelection("need-review", e)}
                >
                  Need Review
                </div>
                <div
                  className="tag-option"
                  data-tag="important"
                  onClick={(e) => handleTagSelection("important", e)}
                >
                  Important
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }
);

const IndividualCourses = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [courseTitle, setCourseTitle] = useState(course?.cleanedName);
  const [expandedSections, setExpandedSections] = useState(new Set([0]));
  const location = useLocation();
  const referalData = location.state;
  // State for categories

  const [categoriesList, setCategoriesList] = useState([]);

  const [instructorList, setInstructorList] = useState([]);
  const [newCategoryInput, setnewCategoryInput] = useState("");
  const [updateCounter, setUpdateCounter] = useState(0);
  const [newInstructorInput, setnewInstructorInput] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseInstructors, setCourseInstructors] = useState(null);
  const [courseCategory, setCourseCategory] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isAddInstructorModalOpen, setIsAddInstructorModalOpen] =
    useState(false);
  const addCategoryRef = useRef(null);
  const addInstructorRef = useRef(null);
  const sectionRef = useRef({});
  const scrollTimeoutRef = useRef(null);
  const [file, setFile] = useState(null);
  const [role, setRole] = useState("");
  const {
    toastMessage,
    setToastMessage,
    toastType,
    setToastType,
    showToast,
    setShowToast,
    setCategoryNeedsUpdate,
  } = useAuth();
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data } = await axios.post(
          "/api/course/individual",
          { CourseId: id },
          { withCredentials: true }
        );
        setCourse(data.course);
        setCourseTitle(data.course.cleanedName);
        setCourseCategory(data.course.category ? [data.course.category] : null);
        setRole(data.role);
        setCategoriesList(data.categories);
        setInstructorList(data.instructors);
        setCourseInstructors(
          data.course.instructors ? data.course.instructors : null
        );
        setLoading(false);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, [updateCounter]);
  const addCategoryBackend = async (category) => {
    try {
      const catogories = await axios.post("/api/admin/category", category, {
        withCredentials: true,
      });
      return catogories;
    } catch (error) {
      console.error(error);
    }
  };
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
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };
  const handleRemoveCategory = (e) => {
    setCourseCategory(courseCategory.filter((a) => a.id !== e.id));
  };

  const handleAddCategory = (e) => {
    const category = courseCategory?.find((category) => category.id === e.id);
    if (!category) {
      setCourseCategory([e]);
    }
    closeAddCategoryModal();
  };

  const handleRemoveInstructor = (instructor) => {
    setCourseInstructors(
      courseInstructors.filter((i) => i.id !== instructor.id)
    );
  };

  const handleAddInstructor = (instructor) => {
    const exists = courseInstructors?.find((i) => i.id === instructor.id);
    if (!exists) {
      setCourseInstructors([...courseInstructors, instructor]);
    }
    closeAddInstructorModal();
  };
  const handleLectureClick = useCallback((courseId, lectureId) => {
    navigate(`/course/play/${courseId}`, {
      state: lectureId,
    });
  }, []);
  const addNewQuickCategory = async () => {
    setShowToast(false);
    if (newCategoryInput.trim()) {
      const newCategory = {
        name: newCategoryInput.trim(),
      };
      setToastType("warning");
      setToastMessage("adding category");
      setShowToast(true);
      const category = await addCategoryBackend(newCategory);
      setToastType("success");
      setToastMessage("category added");
      setShowToast(true);
      setCategoriesList(category.data);
      setnewCategoryInput("");
      setCategoryNeedsUpdate("a");
    } else {
      setToastType("error");
      setToastMessage("name can't be empty when adding category");
      setShowToast(true);
    }
  };
  useLayoutEffect(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (referalData) {
        sectionRef.current[referalData].scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 300);

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [referalData]);
  const handleKeyDown = async (e) => {
    if (e.key === "Enter" && newCategoryInput.trim()) {
      const newCategory = {
        name: newCategoryInput.trim(),
      };
      setToastType("warning");
      setToastMessage("adding category");
      setShowToast(true);
      const category = await addCategoryBackend(newCategory);
      setToastType("success");
      setToastMessage("category added");
      setShowToast(true);
      setCategoriesList(category.data);
      setnewCategoryInput("");
      setCategoryNeedsUpdate("a");
    }
  };

  const addNewQuickInstructor = async () => {
    if (newInstructorInput.trim()) {
      const newInstructor = {
        name: newInstructorInput.trim(),
      };
      setToastType("warning");
      setToastMessage("adding instructor");
      setShowToast(true);
      const instructor = await addInstructorBackend(newInstructor);
      setToastType("success");
      setToastMessage("instructor added");
      setShowToast(true);
      setInstructorList(instructor.data);
      setnewInstructorInput("");
    } else {
      setToastType("error");
      setToastMessage("name can't be empty when adding instructor");
      setShowToast(true);
    }
  };

  const handleKeyDownInstructor = async (e) => {
    if (e.key === "Enter" && newInstructorInput.trim()) {
      const newInstructor = {
        name: newInstructorInput.trim(),
      };
      setToastType("warning");
      setToastMessage("adding instructor");
      setShowToast(true);
      const instructor = await addInstructorBackend(newInstructor);
      setToastType("success");
      setToastMessage("instructor added");
      setShowToast(true);
      setInstructorList(instructor.data);
      setnewInstructorInput("");
    }
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  const openAddCategoryModal = () => {
    setIsAddCategoryModalOpen(true);
    setnewCategoryInput("");
  };
  const closeAddCategoryModal = () => setIsAddCategoryModalOpen(false);
  const openAddInstructorModal = () => setIsAddInstructorModalOpen(true);
  const closeAddInstructorModal = () => setIsAddInstructorModalOpen(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        addCategoryRef.current &&
        !addCategoryRef.current.contains(event.target)
      ) {
        setIsAddCategoryModalOpen(false);
      }
      if (
        addInstructorRef.current &&
        !addInstructorRef.current.contains(event.target)
      ) {
        setIsAddInstructorModalOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const toggleSection = useCallback((sectionId) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);
  const handlePin = async () => {
    try {
      setShowToast(false);
      setToastMessage("adding course to featured");
      setToastType("warning");
      setShowToast(true);
      await axios.post(
        "/api/course/pin",
        { courseId: id },
        { withCredentials: true }
      );
      setShowToast(false);
      setToastMessage("course added to featured");
      setToastType("success");
      setShowToast(true);
    } catch (error) {
      console.error(error);
      setShowToast(false);
      setToastMessage("error adding course to featured");
      setToastType("error");
      setShowToast(true);
    }
  };
  const secondsToHoursRounded = (seconds) => {
    if (typeof seconds !== "number" || isNaN(seconds)) {
      return "Invalid input. Please provide a number for seconds.";
    }
    if (seconds < 0) {
      return "Seconds cannot be negative.";
    }
    const hours = Math.floor(seconds / 3600);
    const remainingSecondsAfterHours = seconds % 3600;
    const minutes = Math.floor(remainingSecondsAfterHours / 60);
    return `${hours} hours and ${minutes} minutes`;
  };
  const handleUpload = async () => {
    const formData = new FormData();
    formData.append("CourseId", id);
    if (courseCategory) {
      formData.append("CategoryId", courseCategory[0].id);
    }
    if (courseDescription) {
      formData.append("description", courseDescription);
    }
    if (courseInstructors) {
      formData.append(
        "Instructors",
        JSON.stringify(courseInstructors.map((instructor) => instructor.id))
      );
    }
    formData.append("CourseName", courseTitle);
    try {
      if (file) {
        formData.append("file", file);
        setToastType("progress");
        setToastMessage("uplaoding");
        setShowToast(true);
      }

      await axios.post("/api/admin/form/course", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        withCredentials: true,
      });
      setUpdateCounter((prev) => prev + 1);

      setToastType("success");
      setToastMessage("updated course");
      setShowToast(true);
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      setToastType("error");
      setToastMessage("error updating course");
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

      <PreNav name={course?.cleanedName} />
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
                    <div className="course-title-inner">
                      <span>{course?.cleanedName || ""}</span>
                      <span
                        className="svg-div play-svg"
                        onClick={() => navigate(`/course/play/${id}`)}
                      >
                        <Play />
                      </span>
                      <span className="svg-div pin-svg" onClick={handlePin}>
                        <PinSolid />
                      </span>
                    </div>
                    {role === "admin" && (
                      <div className="edit-information">
                        <div
                          title="Edit Instructor"
                          style={{ cursor: "pointer" }}
                          className="svg-div"
                          onClick={openModal}
                        >
                          <DotsVerticalRounded />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bottom">
                <div className="bottom-container">
                  <div className="instructor-section">
                    Instructors :{" "}
                    {courseInstructors?.map((instructor, index) => (
                      <span
                        onClick={() => navigate(`/instructor/${instructor.id}`)}
                        key={instructor.id}
                        className="featured-instructor-link"
                      >
                        {(index ? ", " : "") + instructor.name}
                      </span>
                    ))}
                  </div>
                  <div className="category-bottom-container">
                    <span className="drop-cap">Category : </span>
                    <span
                      onClick={() =>
                        navigate(`/category/${course?.category?.id}`)
                      }
                      className="featured-instructor-link"
                    >
                      {course?.category?.category}
                    </span>
                  </div>
                  <div className="description">
                    <span className="drop-cap">Description : </span>
                    {course?.description}
                  </div>
                  <div> {secondsToHoursRounded(course?.duration)}</div>
                  <div>
                    Progress :{" "}
                    {course?.courseprogresses?.[0]?.progress
                      ? `${course?.courseprogresses?.[0]?.progress}%`
                      : ""}
                  </div>
                </div>
              </div>
              <div className="img-container course-info-image instructor-info-image">
                <img src={course?.photo || "/assets/placeholder.avif"} alt="" />
              </div>
            </div>
          </div>
          <div className="content-heading">Course Content</div>
          <div className="course-content">
            <div className="course-section">
              <div className="section-list">
                {course?.sections.map((section) => (
                  <div key={section.id} className="section-item-course">
                    <SectionHeader
                      sectionOrder={section.order}
                      title={section.cleanedName}
                      hasLectures={section.lectures.length > 0}
                      isExpanded={expandedSections.has(section.id)}
                      duration={section.duration}
                      onToggle={() => toggleSection(section.id)}
                      total={section.lectures.length}
                      sectionRef={sectionRef}
                      sectionId={section.id}
                      referalData={referalData}
                    />
                    <AnimatePresence>
                      {expandedSections.has(section.id) &&
                        section.lectures.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="lectures-container"
                          >
                            {section.lectures.map((lecture, index) => (
                              <LectureItem
                                key={lecture.id}
                                lectureId={lecture.id}
                                lectureOrder={index + 1}
                                sectionOrder={section.order}
                                title={lecture.cleanedName}
                                type={lecture.type}
                                duration={lecture.duration}
                                content={lecture.content}
                                courseId={id}
                                setToastMessage={setToastMessage}
                                setToastType={setToastType}
                                setShowToast={setShowToast}
                                onLectureClick={handleLectureClick}
                                courseName={course.cleanedName}
                              />
                            ))}
                          </motion.div>
                        )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
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
                  <div className="modal-heading">Edit Course</div>
                  <div className="edit-course-form">
                    <div className="course-title-edit">
                      <div>Edit Title</div>
                      <div className="modal-input-course-edit">
                        <input
                          onChange={(e) => setCourseTitle(e.target.value)}
                          className="input"
                          value={courseTitle}
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
                      <div className="add-categories">
                        Category
                        <div
                          title="Add Categories"
                          className="svg-div icon-plus"
                          onClick={openAddCategoryModal}
                        >
                          <Plus />
                        </div>
                      </div>
                      <div className="category-list">
                        {courseCategory?.map((e) => (
                          <div key={e.id} className="single-category">
                            {e.category}
                            <div
                              className="svg-div"
                              onClick={() => handleRemoveCategory(e)}
                              style={{ cursor: "pointer" }}
                            >
                              <TrashAltSolid />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="course-title-edit">
                      <div className="add-instructors">
                        Instructors
                        <div
                          title="Add Instructors"
                          className="svg-div icon-plus"
                          onClick={openAddInstructorModal}
                        >
                          <Plus />
                        </div>
                      </div>
                      <div className="instructor-list">
                        {courseInstructors?.map((instructor) => (
                          <div
                            key={instructor.id}
                            className="single-instructor"
                          >
                            {instructor.name}
                            <div
                              className="svg-div"
                              onClick={() => handleRemoveInstructor(instructor)}
                              style={{ cursor: "pointer" }}
                            >
                              <TrashAltSolid />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="course-title-edit">
                      <div>Edit Description</div>
                      <div className="modal-input-description-edit">
                        <textarea
                          onChange={(e) => setCourseDescription(e.target.value)}
                          value={courseDescription}
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
                  style={{ color: "#00a6a6", cursor: "pointer" }}
                  onClick={handleUpload}
                >
                  Save
                </motion.div>
                <motion.div
                  className="modal-buttons"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  style={{ color: "#45312d", cursor: "pointer" }}
                  onClick={closeModal}
                >
                  Cancel
                </motion.div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddCategoryModalOpen && (
          <div className="modal-overlay add-category-overlay">
            <motion.div
              className="list-modal"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              ref={addCategoryRef}
            >
              <div className="select-category-instructor-group">
                <div className="select-category-instructor">
                  Select Category
                </div>
                <div
                  onClick={closeAddCategoryModal}
                  style={{ cursor: "pointer" }}
                  className="close-button"
                >
                  <div className="svg-div">
                    <X />
                  </div>
                </div>
              </div>
              <div className="add-category-instructor-input">
                <input
                  type="text"
                  onChange={(e) => setnewCategoryInput(e.target.value)}
                  value={newCategoryInput}
                  onKeyDown={handleKeyDown}
                  placeholder="create new category"
                />
                <div
                  className="svg-div "
                  style={{ cursor: "pointer" }}
                  onClick={addNewQuickCategory}
                >
                  <PlusCircle />
                </div>
              </div>
              <div className="list-modal-wrap">
                {categoriesList.map((e) => (
                  <div
                    key={e.id}
                    className="single-add-category"
                    onClick={() => handleAddCategory(e)}
                    style={{ cursor: "pointer" }}
                  >
                    {e.category}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddInstructorModalOpen && (
          <div className="modal-overlay add-instructor-overlay">
            <motion.div
              className="list-modal"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              ref={addInstructorRef}
            >
              <div className="select-category-instructor-group">
                <div className="select-category-instructor">
                  Select Instructor
                </div>
                <div
                  onClick={closeAddInstructorModal}
                  style={{ cursor: "pointer" }}
                  className="close-button"
                >
                  <div className="svg-div">
                    <X />
                  </div>
                </div>
              </div>
              <div className="add-category-instructor-input">
                <input
                  type="text"
                  onChange={(e) => setnewInstructorInput(e.target.value)}
                  value={newInstructorInput}
                  onKeyDown={handleKeyDownInstructor}
                  placeholder="create new instructor"
                />
                <div
                  className="svg-div"
                  style={{ cursor: "pointer" }}
                  onClick={addNewQuickInstructor}
                >
                  <PlusCircle />
                </div>
              </div>
              <div className="list-modal-wrap">
                {instructorList.map((instructor) => (
                  <div
                    key={instructor.id}
                    className="single-add-instructor"
                    onClick={() => handleAddInstructor(instructor)}
                    style={{ cursor: "pointer" }}
                  >
                    {instructor.name}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default IndividualCourses;
