import { useLocation, useNavigate } from "react-router-dom";
import { LogOutCircle, User } from "../../assets";
import { useAuth } from "../../context/AuthContext";
import {
  isNavigationItemActive,
  navigationItems,
} from "./navigationItems";

const TopNavigation = () => {
  const { logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <header className="app-top-navigation">
      <button
        className="top-navigation-brand"
        onClick={() => navigate("/")}
        type="button"
      >
        VIDYA
      </button>
      <nav className="top-navigation-links" aria-label="Primary navigation">
        {navigationItems.map(({ label, path }) => {
          const isActive = isNavigationItemActive(pathname, path);

          return (
            <button
              aria-current={isActive ? "page" : undefined}
              className={`top-navigation-link${isActive ? " is-active" : ""}`}
              key={path}
              onClick={() => navigate(path)}
              type="button"
            >
              {label}
            </button>
          );
        })}
      </nav>
      <div className="top-navigation-actions">
        <button
          aria-label="Open settings"
          className="top-navigation-icon"
          onClick={() => navigate("/settings")}
          title="Settings"
          type="button"
        >
          <User />
        </button>
        <button
          aria-label="Log out"
          className="top-navigation-icon"
          onClick={logout}
          title="Log out"
          type="button"
        >
          <LogOutCircle />
        </button>
      </div>
    </header>
  );
};

export default TopNavigation;
