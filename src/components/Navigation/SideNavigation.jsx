import { useLocation, useNavigate } from "react-router-dom";
import { LogOutCircle } from "../../assets";
import { useAuth } from "../../context/AuthContext";
import {
  isNavigationItemActive,
  navigationItems,
} from "./navigationItems";

const SideNavigation = () => {
  const { logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <aside className="app-side-navigation" aria-label="Primary navigation">
      <div className="side-navigation-brand">VIDYA</div>
      <nav className="side-navigation-links">
        {navigationItems.map(({ label, path, icon: Icon }) => {
          const isActive = isNavigationItemActive(pathname, path);

          return (
            <button
              className={`side-navigation-link${isActive ? " is-active" : ""}`}
              key={path}
              onClick={() => navigate(path)}
              title={label}
              type="button"
              aria-current={isActive ? "page" : undefined}
            >
              <Icon />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
      <button
        className="side-navigation-link side-navigation-logout"
        onClick={logout}
        title="Log out"
        type="button"
      >
        <LogOutCircle />
        <span>Log out</span>
      </button>
    </aside>
  );
};

export default SideNavigation;
