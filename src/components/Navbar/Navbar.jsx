import { useLocation, useNavigate } from "react-router-dom";
import React from "react";
const Navbar = ({ navItem }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleYourCourses = (id) => {
    if (location.pathname !== `/category/${id}`) {
      navigate(`/category/${id}`);
    }
  };

  const currentPathId = location.pathname.startsWith("/category/")
    ? location.pathname.split("/category/")[1]
    : null;
  const isLowerThanFive = navItem && navItem.length < 5;
  return (
    <>
      <div className={isLowerThanFive ? "nav-bar" : "nav-bar justified"}>
        {navItem &&
          navItem.map((cat) => (
            <div
              key={cat.id}
              className={
                currentPathId === cat.id.toString()
                  ? "active nav-item"
                  : "nav-item"
              }
              onClick={() => handleYourCourses(cat.id)}
            >
              <span className="nav-item-name">{cat.category}</span>
            </div>
          ))}
      </div>
    </>
  );
};

export default React.memo(Navbar);
