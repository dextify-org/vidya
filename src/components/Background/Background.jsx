import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
const Background = () => {
  const location = useLocation();
  const [positions, setPositions] = useState([
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ]);

  useEffect(() => {
    const newPositions = [
      {
        x:
          ((Math.random() * window.innerWidth) / 2) *
          (Math.random() < 0.5 ? -1 : 1),
        y: (Math.random() * window.innerHeight) / 2,
      },
      {
        x:
          ((Math.random() * window.innerWidth) / 2) *
          (Math.random() < 0.5 ? -1 : 1),
        y: (Math.random() * window.innerHeight) / 2,
      },
      {
        x:
          ((Math.random() * window.innerWidth) / 2) *
          (Math.random() < 0.5 ? -1 : 1),
        y: (Math.random() * window.innerHeight) / 2,
      },
      {
        x:
          ((Math.random() * window.innerWidth) / 2) *
          (Math.random() < 0.5 ? -1 : 1),
        y: (Math.random() * window.innerHeight) / 2,
      },
    ];

    setPositions(newPositions);
  }, [location.pathname]);

  return (
    <div className="background">
      <div className="circle"></div>
      <div className="circle2"></div>
      <div className="circle3"></div>
      <div className="circle8"></div>
      <motion.div
        animate={{ x: positions[0].x, y: positions[0].y }}
        transition={{ duration: 1, ease: "easeInOut" }}
        className="circle4"
      ></motion.div>
      <motion.div
        animate={{ x: positions[1].x, y: positions[1].y }}
        transition={{ duration: 1, ease: "easeInOut" }}
        className="circle5"
      ></motion.div>
      <motion.div
        animate={{ x: positions[2].x, y: positions[2].y }}
        transition={{ duration: 1, ease: "easeInOut" }}
        className="circle6"
      ></motion.div>
      <motion.div
        animate={{ x: positions[3].x, y: positions[3].y }}
        transition={{ duration: 1, ease: "easeInOut" }}
        className="circle7"
      ></motion.div>
    </div>
  );
};

export default Background;
