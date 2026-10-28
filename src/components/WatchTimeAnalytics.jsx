import React from "react";

const WatchTimeAnalytics = ({ weeklyWatchTime, categoryWatchTime }) => {
  const maxDailyWatchTime = Math.max(
    ...Object.values(weeklyWatchTime.watchTimeByDay).map((seconds) => seconds)
  );

  const formatTime = (duration) => {
    if (duration < 60) {
      return `${duration}s`;
    } else if (duration < 3600) {
      const minutes = (duration / 60).toFixed(1);
      return `${minutes}m`;
    } else if (duration < 86400) {
      const hours = (duration / 3600).toFixed(1);
      return `${hours}h`;
    } else {
      const days = (duration / 86400).toFixed(1);
      return `${days}d`;
    }
  };
  const maxCategoryWatchTime =
    categoryWatchTime.categoryWatchtime.length > 0
      ? Math.max(
          ...categoryWatchTime.categoryWatchtime.map((cat) => cat.watchtime)
        )
      : 0;

  const orderedDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  return (
    <div className="watch-time-analytics">
      <div className="watch-time-analytics-graph">
        <div className="watch-time-title">Watch Time Analytics</div>
        <div className="watch-time-details">
          Your learning activity this week
        </div>
        <div className="graph-div">
          {orderedDays.map((day) => {
            const watchSeconds = weeklyWatchTime.watchTimeByDay[day] || 0;
            const barHeight =
              maxDailyWatchTime > 0
                ? (watchSeconds / maxDailyWatchTime) * 100
                : 0;

            return (
              <div className="graph-div-wrap" key={day}>
                <div className="graph-hour">
                  {watchSeconds > 1 ? formatTime(watchSeconds) : ""}
                </div>
                <div
                  className="graph-bar"
                  style={{
                    height: `${Math.max(barHeight, 1)}%`,
                    backgroundColor: "#0a2463",
                    width: "2.5rem",
                  }}
                ></div>
                <div className="graph-day">{day.substring(0, 3)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="watch-time-analytics-categories">
        <div className="watch-time-category-details">
          Your watch time by categories
        </div>
        <div className="graph-div-categories">
          {categoryWatchTime.categoryWatchtime.map((category, index) => (
            <React.Fragment key={index}>
              <div className="graph-name">{category.category}</div>
              <div className="graph-div-wrap-categories">
                <div
                  className="graph-bar-categories"
                  style={{
                    width: `${
                      (category.watchtime / maxCategoryWatchTime) * 100
                    }%`,
                    backgroundColor: "#0a2463",
                    height: "1rem",
                  }}
                ></div>
                <div className="graph-hour">
                  {category.watchtime > 1 ? formatTime(category.watchtime) : ""}
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WatchTimeAnalytics;
