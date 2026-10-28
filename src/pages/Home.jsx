import Stats from "../components/Stats";
import Navbar from "../components/Navbar/Navbar";
import PreNav from "../components/Navbar/PreNav";
import Cards from "../components/Cards/Cards";
import Tilt from "react-parallax-tilt";
import Loader from "../components/Loader/Loader.jsx";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "../api/axiosInstance.js";
import { useEffect, useState, useRef } from "react";
import ContinueWatching from "../components/Cards/ContinueWatching.jsx";
import { ChevronRight } from "../assets/index.jsx";

const Home = ({ category }) => {
  const [homeData, setHomeData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const continueRef = useRef(null);
  const latestRef = useRef(null);
  const handlePlayer = () =>
    navigate(
      `/course/play/${
        homeData?.featuredCourse
          ? homeData.featuredCourse.id
          : homeData.latestCourse[0].id
      }`,
    );
  const formatTime = (duration) => {
    if (duration < 60) {
      return `${duration}S`;
    } else if (duration < 3600) {
      const minutes = (duration / 60).toFixed(1);
      return `${minutes}M`;
    } else if (duration < 86400) {
      const hours = (duration / 3600).toFixed(1);
      return `${hours}H`;
    } else {
      const days = (duration / 86400).toFixed(1);
      return `${days}D`;
    }
  };
  const handleCourse = () => {
    navigate(
      `/courses/${
        homeData?.featuredCourse
          ? homeData.featuredCourse.id
          : homeData.latestCourse[0].id
      }`,
    );
  };
  const handleInstructor = (id) => {
    navigate(`instructor/${id}`);
  };
  const scrollLeft = () => {
    if (latestRef.current) {
      latestRef.current.scrollBy({ left: -900, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (latestRef.current) {
      latestRef.current.scrollBy({ left: 900, behavior: "smooth" });
    }
  };
  const scrollLeftContinue = () => {
    if (continueRef.current) {
      continueRef.current.scrollBy({ left: -900, behavior: "smooth" });
    }
  };

  const scrollRightContinue = () => {
    if (continueRef.current) {
      continueRef.current.scrollBy({ left: 900, behavior: "smooth" });
    }
  };
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get("/api/home", {
          withCredentials: true,
        });
        setHomeData(response.data);
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);
  const rawStats = homeData?.categoryWatchTime?.categoryWatchtime;
  const topCategoryStats = rawStats
    ? (() => {
        const sorted = [...rawStats].sort((a, b) => b.watchtime - a.watchtime);
        const top5 = sorted.slice(0, 5);
        const rest = sorted.slice(5);
        if (rest.length > 0) {
          top5.push({
            category: "Others",
            watchtime: rest.reduce((sum, item) => sum + item.watchtime, 0),
          });
        }
        return top5;
      })()
    : null;
  const statsColor = [
    "#605F5E",
    "#FB3640",
    "#0A2463",
    "#247BA0",
    "#E9A7FF",
    "#E6C229",
  ];
  return (
    <>
      <PreNav name={"VIDYA"} />
      <Navbar navItem={category} />
      {isLoading && <Loader />}
      {!isLoading && (
        <motion.div
          initial={{ opacity: 0, x: -200 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 200 }}
          className="home-content"
        >
          <div className="featured">
            <p className="pinned-title featured-title">FEATURED</p>
            <div className="feat-stats">
              <div className="featured-course">
                <div className="featured-image" onClick={handleCourse}>
                  <img
                    src={
                      homeData &&
                      (!(homeData?.featuredCourse === null)
                        ? homeData?.featuredCourse?.photo === null
                          ? "/assets/placeholder.avif"
                          : homeData?.featuredCourse?.photo
                        : homeData?.latestCourse[0]?.photo === null
                          ? "/assets/placeholder.avif"
                          : homeData?.latestCourse[0]?.photo)
                    }
                    alt=""
                  />
                </div>
                <div className="featured-info">
                  <div className="featured-info-details">
                    <div className="info-title" onClick={handleCourse}>
                      {homeData &&
                        (!(homeData?.featuredCourse === null)
                          ? homeData.featuredCourse?.cleanedName
                          : homeData.latestCourse[0]?.cleanedName)}
                    </div>
                    <div className="instructor-name">
                      by{" "}
                      {homeData &&
                        (!(homeData?.featuredCourse === null)
                          ? homeData.featuredCourse?.instructors
                          : homeData.latestCourse[0]?.instructors
                        )?.map((item, index) => (
                          <span
                            className="featured-instructor-link"
                            onClick={() => {
                              handleInstructor(item.id);
                            }}
                            key={item.id}
                          >
                            {(index ? ", " : "") + item.name}
                          </span>
                        ))}
                    </div>
                    <div className="play-button" onClick={handlePlayer}>
                      Play Now
                    </div>
                  </div>
                </div>
              </div>
              <Tilt className="stats" perspective={4000}>
                <Stats watchtimeData={topCategoryStats} />
                <div className="watch">
                  <div className="watch-hours">WATCH TIME</div>
                  <div className="hours">
                    {formatTime(homeData?.categoryWatchTime?.totalWatchtime)}
                  </div>
                </div>
                <div className="labels">
                  {topCategoryStats &&
                    topCategoryStats.map((item, index) => (
                      <div className="label-names" key={index}>
                        <div
                          className="rectangle"
                          style={{ backgroundColor: statsColor[index] }}
                        ></div>
                        {item.category} -{" "}
                        {(
                          (item.watchtime /
                            homeData?.categoryWatchTime?.totalWatchtime) *
                          100
                        ).toFixed(1)}{" "}
                        %
                      </div>
                    ))}
                </div>
              </Tilt>
            </div>
          </div>

          <div className="continue">
            <div className="title-scroll-buttons">
              <p className="pinned-title">CONTINUE LEARNING</p>
              <div className="scroll-button">
                <button
                  className="left-scroll"
                  onClick={scrollLeftContinue}
                  aria-label="Scroll continue learning left"
                >
                  <ChevronRight />
                </button>
                <button
                  className="right-scroll"
                  onClick={scrollRightContinue}
                  aria-label="Scroll continue learning right"
                >
                  <ChevronRight />
                </button>
              </div>
            </div>
            <div className="card-divs home-card-divs" ref={continueRef}>
              {homeData &&
                homeData.continueWatching.map((item, index) => (
                  <ContinueWatching
                    key={index}
                    imgsrc={
                      item.course.photo === null
                        ? "/assets/placeholder.avif"
                        : item.course.photo
                    }
                    lectureName={item.lecture?.cleanedName}
                    courseId={item.course.id}
                    courseName={item.course.cleanedName}
                  />
                ))}
            </div>
          </div>
          <div className="latest-courses">
            <div className="title-scroll-buttons">
              <p className="pinned-title">LATEST COURSES</p>
              <div className="scroll-button">
                <button
                  className="left-scroll"
                  onClick={scrollLeft}
                  aria-label="Scroll latest courses left"
                >
                  <ChevronRight />
                </button>
                <button
                  className="right-scroll"
                  onClick={scrollRight}
                  aria-label="Scroll latest courses right"
                >
                  <ChevronRight />
                </button>
              </div>
            </div>

            <div className="card-divs home-card-divs" ref={latestRef}>
              {homeData &&
                homeData.latestCourse.map((item, index) => (
                  <Cards
                    key={index}
                    imgsrc={
                      item.photo === null
                        ? "/assets/placeholder.avif"
                        : item.photo
                    }
                    info={item.cleanedName}
                    courseId={item.id}
                  />
                ))}
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
};

export default Home;
