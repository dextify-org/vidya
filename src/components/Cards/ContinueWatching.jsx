import { useNavigate } from "react-router-dom";
import { Play } from "../../assets";

const ContinueWatching = ({ imgsrc, lectureName, courseName, courseId }) => {
  const navigate = useNavigate();
  const handlePlayer = () => {
    navigate(`/course/play/${courseId}`);
  };
  const handleCourse = () => {
    navigate(`/courses/${courseId}`);
  };
  return (
    <>
      <div className="cards">
        <div className="card-image" onClick={handlePlayer}>
          <img src={imgsrc} alt="" />
          <div className="overlay-card">
            <div className="play-button-card">
              <Play />
            </div>
          </div>
        </div>
        <div className="card-info">
          <div className="card-info-course">
            <div className="card-info-course-title" onClick={handleCourse}>
              {courseName}
            </div>
          </div>
          <div className="card-info-lecture">
            <div className="card-info-lecture-title" onClick={handlePlayer}>
              {lectureName}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContinueWatching;
