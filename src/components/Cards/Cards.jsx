import { useNavigate } from "react-router-dom";
import { Play } from "../../assets";

const Cards = ({ imgsrc, info, courseId }) => {
  const navigate = useNavigate();

  const handleCourse = () => {
    navigate(`/courses/${courseId}`);
  };

  const handlePlayer = () => {
    navigate(`/course/play/${courseId}`);
  };

  return (
    <div className="cards">
      <div className="card-image" onClick={handlePlayer}>
        <img src={imgsrc ? imgsrc : "/assets/placeholder.avif"} alt="" />
        <div className="overlay-card">
          <div className="play-button-card">
            <Play />
          </div>
        </div>
      </div>
      <div className="card-info" onClick={handleCourse}>
        <div className="card-info-course">
          <div className="card-info-course-title">{info}</div>
        </div>
      </div>
    </div>
  );
};

export default Cards;
