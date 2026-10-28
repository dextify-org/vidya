import { useTheme } from "../../theme/ThemeContext";
import SideNavigation from "./SideNavigation";
import TopNavigation from "./TopNavigation";

const AppNavigation = () => {
  const {
    preferences: { design, navigation },
  } = useTheme();

  if (navigation === "vertical" || navigation === "compact") {
    return <SideNavigation />;
  }

  if (design === "theme3") {
    return <TopNavigation />;
  }

  return null;
};

export default AppNavigation;
