import { useState, useEffect } from "react";
import FirstStartUp from "./pages/FirstStartUp";
import Background from "./components/Background/Background";
import AnimatedRoutes from "./AnimatedRoutes";
import { AuthProvider } from "./context/AuthContext";
import "./style.css";
import axios from "./api/axiosInstance.js";
import { BrowserRouter as Router } from "react-router-dom";
import { SkeletonLoader } from "./assets/index.jsx";

const App = () => {
  const [data, setData] = useState(null);
  const fetchData = async () => {
    try {
      const res = await axios.get("/isFirstStartUp");
      setData(res.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (data === null) {
    return (
      <Router>
        <Background />
        <SkeletonLoader />
      </Router>
    );
  }

  return (
    <Router>
      <AuthProvider>
        <Background />
        {data ? <FirstStartUp /> : <AnimatedRoutes />}
      </AuthProvider>
    </Router>
  );
};

export default App;
