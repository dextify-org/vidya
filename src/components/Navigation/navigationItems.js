import {
  CategoryAlt,
  ChalkboardSolid,
  Cog,
  DashboardSolid,
  GraduationSolid,
  HomeAlt2,
} from "../../assets";

export const navigationItems = [
  { label: "Home", path: "/", icon: HomeAlt2 },
  { label: "Courses", path: "/courses", icon: ChalkboardSolid },
  { label: "Categories", path: "/categories", icon: CategoryAlt },
  { label: "Instructors", path: "/instructor", icon: GraduationSolid },
  { label: "Dashboard", path: "/dashboard", icon: DashboardSolid },
  { label: "Settings", path: "/settings", icon: Cog },
];

export const isNavigationItemActive = (pathname, path) =>
  path === "/" ? pathname === path : pathname.startsWith(path);
