import React from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Legend);

const Stats = ({ watchtimeData }) => {
  const timeArray = watchtimeData?.map((item) => item.watchtime);
  const data = {
    datasets: [
      {
        data: timeArray,
        backgroundColor: [
          "#605F5E",
          "#FB3640",
          "#0A2463",
          "#247BA0",
          "#E9A7FF",
          "#E6C229",
        ],

        cutout: "87%",
        borderWidth: 0,
      },
    ],
  };
  return <Doughnut data={data} />;
};

export default Stats;
