import React, { useEffect, useState } from "react";
import PreNav from "../components/Navbar/PreNav";
import axios from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext";
import WatchTimeAnalytics from "../components/WatchTimeAnalytics";
import Toast from "../components/Toast/Toast";
import {
  FlagAltSolid,
  TimeFive,
  BookContent,
  Bookmark,
  PurchaseTag,
  Play,
  TrashAltSolid,
} from "../assets";
import Loader from "../components/Loader/Loader";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("difficult");
  const [dashboardData, setDashboardData] = useState(null);
  const [errorData, setErrorData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await axios.get(
          "/api/dashboard/",

          { withCredentials: true }
        );
        setDashboardData(data);
        setLoading(false);
      } catch (error) {
        console.error(error);
        setErrorData("Error fetching dashrboad data");
      }
    };
    fetchData();
  }, []);
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };
  const handleLectureClick = (courseId, lectureId) => {
    navigate(`/course/play/${courseId}`, {
      state: lectureId,
    });
  };
  const renderedTabContent = () => {
    const handleDeleteItem = async (id) => {
      setShowToast(false);

      try {
        const response = await axios.post(
          "/api/user/remove-tag",
          { id },
          { withCredentials: true }
        );
        const { data } = await axios.get(
          "/api/dashboard/",

          { withCredentials: true }
        );
        setDashboardData(data);
        setToastType("success");
        setToastMessage("Item has been successfully deleted");
        setShowToast(true);
      } catch (error) {
        const errorMessage =
          error.response?.data?.message || "Failed to delete item";
        setToastType("error");
        setToastMessage(errorMessage);
        setShowToast(true);
        console.error("Delete item error:", error);
      }
    };

    switch (activeTab) {
      case "difficult":
        return (
          <>
            {dashboardData &&
            dashboardData?.tagsAndBookmarks.difficult.length === 0 ? (
              <div style={{ opacity: ".6", margin: "1rem" }}>
                No Tags, select lecture menu when playing to add
              </div>
            ) : (
              dashboardData?.tagsAndBookmarks.difficult.map((item) => (
                <div className="tag-content" key={item.id}>
                  <div className="tag-icon-difficult">
                    <PurchaseTag />
                  </div>
                  <div
                    onClick={() =>
                      handleLectureClick(item.courseId, item.lectureId)
                    }
                    className="tag-content-title"
                  >
                    {item.name}
                  </div>
                  <div
                    className="tag-content-course tag-bookmark-ellipsis"
                    onClick={() => navigate(`/courses/${item.courseId}`)}
                  >
                    {" "}
                    in {item.courseName}
                  </div>
                  <div
                    className="tag-delete-icon"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <TrashAltSolid />
                  </div>
                </div>
              ))
            )}
          </>
        );
      case "need review":
        return (
          <>
            {dashboardData &&
            dashboardData?.tagsAndBookmarks["need-review"].length === 0 ? (
              <div style={{ opacity: ".6", margin: "1rem" }}>
                No Tags, select lecture menu when playing to add
              </div>
            ) : (
              dashboardData?.tagsAndBookmarks["need-review"].map((item) => (
                <div className="tag-content" key={item.id}>
                  <div className="tag-icon-need-review">
                    <PurchaseTag />
                  </div>
                  <div
                    onClick={() =>
                      handleLectureClick(item.courseId, item.lectureId)
                    }
                    className="tag-content-title"
                  >
                    {item.name}
                  </div>
                  <div
                    className="tag-content-course tag-bookmark-ellipsis"
                    onClick={() => navigate(`/courses/${item.courseId}`)}
                  >
                    {" "}
                    in {item.courseName}
                  </div>
                  <div
                    className="tag-delete-icon"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <TrashAltSolid />
                  </div>
                </div>
              ))
            )}
          </>
        );
      case "important":
        return (
          <>
            {dashboardData &&
            dashboardData?.tagsAndBookmarks.important.length === 0 ? (
              <div style={{ opacity: ".6", margin: "1rem" }}>
                No Tags, select lecture menu when playing to add
              </div>
            ) : (
              dashboardData?.tagsAndBookmarks.important.map((item) => (
                <div className="tag-content" key={item.id}>
                  <div className="tag-icon-important">
                    <PurchaseTag />
                  </div>
                  <div
                    onClick={() =>
                      handleLectureClick(item.courseId, item.lectureId)
                    }
                    className="tag-content-title"
                  >
                    {item.name}
                  </div>
                  <div
                    className="tag-content-course tag-bookmark-ellipsis"
                    onClick={() => navigate(`/courses/${item.courseId}`)}
                  >
                    {" "}
                    in {item.courseName}
                  </div>
                  <div
                    className="tag-delete-icon"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <TrashAltSolid />
                  </div>
                </div>
              ))
            )}
          </>
        );
    }
  };
  const handleDeleteItem = async (id) => {
    setShowToast(false);

    try {
      const response = await axios.post(
        "/api/user/remove-tag",
        { id },
        { withCredentials: true }
      );
      const { data } = await axios.get(
        "/api/dashboard/",

        { withCredentials: true }
      );
      setDashboardData(data);
      setToastType("success");
      setToastMessage("Item has been successfully deleted");
      setShowToast(true);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to delete item";
      setToastType("error");
      setToastMessage(errorMessage);
      setShowToast(true);
      console.error("Delete item error:", error);
    }
  };

  if (errorData) {
    return <div>{errorData}</div>;
  } else if (loading) {
    return <Loader />;
  } else {
    return (
      <>
        <PreNav name={"Dashboard"} />
        {showToast && (
          <Toast
            message={toastMessage}
            type={toastType}
            duration={3000}
            onClose={() => setShowToast(false)}
          />
        )}
        <motion.div
          initial={{ opacity: 0, x: -200 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 200 }}
          className="inner-container"
        >
          <div className="welcome-streak">
            <div className="welcome">
              <div className="welcome-heading">Welcome Back</div>
              <div className="student-name">{user.username}</div>
            </div>
            <div className="streak">
              <div className="hrs-this-week">
                <TimeFive />{" "}
                {dashboardData?.weeklyWatchTime.totalWatchTimeFormatted} this
                week
              </div>
              <div className="streak-days">
                <FlagAltSolid />{" "}
                {dashboardData?.watchStreak === 1
                  ? dashboardData?.watchStreak + " day streak!"
                  : dashboardData?.watchStreak + " days streak!"}
              </div>
            </div>
          </div>
          <div className="current-progress-quick-stats">
            <div className="current-progress">
              <div className="current-progress-name">Current Progress</div>

              {dashboardData &&
                dashboardData.recentCoursesProgress.map((item) => (
                  <div className="current-progress-categories" key={item.id}>
                    <div className="current-progress-categories-wrap">
                      <div
                        style={{ cursor: "pointer" }}
                        className="current-progress-categories-name"
                        onClick={() => navigate(`/courses/${item.course.id}`)}
                      >
                        {item.course.cleanedName}
                      </div>
                      <div className="current-progress-categories-percentage">
                        {item.progress === null ? 0 : item.progress}%
                      </div>
                    </div>
                    <div className="current-progress-bar">
                      <div
                        className="current-progress-bar-filled"
                        style={{
                          width: `${
                            item.progress === null ? 0 : item.progress
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
            </div>
            <div className="quick-stats">
              <div className="quick-stats-name">Quick Stats</div>
              <div className="quick-stats-data-wrap">
                <div className="quick-stats-data">
                  <BookContent />
                  Completed Courses
                </div>
                {dashboardData?.courseCompletionStats.completedCourses}/
                {dashboardData?.courseCompletionStats.totalCourses}
              </div>
              <div className="quick-stats-data-wrap">
                <div className="quick-stats-data">
                  <Play />
                  Currently Watching
                </div>
                {dashboardData?.courseCompletionStats.currentlyWatching} Courses
              </div>
              <div className="quick-stats-data-wrap">
                <div className="quick-stats-data">
                  <Bookmark />
                  Bookmark
                </div>
                {dashboardData?.tagsAndBookmarks.bookmark.length} Lectures
              </div>
            </div>
          </div>
          {dashboardData && (
            <WatchTimeAnalytics
              weeklyWatchTime={dashboardData?.weeklyWatchTime}
              categoryWatchTime={dashboardData?.categoryWatchTime}
            />
          )}

          <div className="bookmark-tags">
            <div className="bookmark">
              <div className="bookmark-name">Bookmark</div>
              <div className="bookmark-tags-wrap">
                {dashboardData &&
                dashboardData?.tagsAndBookmarks.bookmark.length === 0 ? (
                  <div style={{ opacity: ".6", marginLeft: "1rem" }}>
                    No Bookmarks, select lecture menu when playing to add
                  </div>
                ) : (
                  dashboardData?.tagsAndBookmarks.bookmark.map((item) => (
                    <div className="bookmarks" key={item.id}>
                      <div className="bookmark-icon">
                        <Bookmark />
                      </div>
                      <div
                        onClick={() =>
                          handleLectureClick(item.courseId, item.lectureId)
                        }
                        className="bookmark-title tag-bookmark-ellipsis"
                      >
                        {item.name}
                      </div>
                      <div
                        className="tag-content-course tag-bookmark-ellipsis"
                        onClick={() => navigate(`/courses/${item.courseId}`)}
                      >
                        {" "}
                        in {item.courseName}
                      </div>
                      <div
                        className="tag-delete-icon"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <TrashAltSolid />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="tags">
              <div className="tag-tab-group">
                <div className="tag-name">Tags</div>
                <div className="tag-tab">
                  <div
                    style={{ cursor: "pointer" }}
                    className={
                      activeTab === "difficult"
                        ? "tag-difficult active-tag-tab"
                        : "tag-difficult"
                    }
                    onClick={() => handleTabChange("difficult")}
                  >
                    difficult
                  </div>
                  <div
                    style={{ cursor: "pointer" }}
                    className={
                      activeTab === "need review"
                        ? "tag-need-review active-tag-tab"
                        : "tag-need-review"
                    }
                    onClick={() => handleTabChange("need review")}
                  >
                    need review
                  </div>
                  <div
                    style={{ cursor: "pointer" }}
                    onClick={() => handleTabChange("important")}
                    className={
                      activeTab === "important"
                        ? "tag-important active-tag-tab"
                        : "tag-important"
                    }
                  >
                    important
                  </div>
                </div>
              </div>
              <div className="bookmark-tags-wrap">{renderedTabContent()}</div>
            </div>
          </div>
        </motion.div>
      </>
    );
  }
};

export default Dashboard;
