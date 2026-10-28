import { AnimatePresence, motion } from "framer-motion";
import React, { useState, useRef, useCallback, memo, useEffect } from "react";
import axios from "../../api/axiosInstance";
import {
  Captions,
  ExitFullscreen,
  FastForward,
  Fullscreen,
  Pause,
  Play,
  Rewind,
  SkipNext,
  SkipPrevious,
  SolidCaptions,
  ToggleLeft,
  ToggleRight,
  VolumeFullSolid,
  VolumeLowSolid,
  VolumeMuteSolid,
} from "../../assets";

const formatTime = (time) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

const Controls = memo(
  ({
    isPlaying,
    isMuted,
    isCaptionOn,
    isFullScreen,
    currentTime,
    duration,
    buffered,
    volume,
    playbackSpeed,
    isAutoplayOn,
    onPlayPause,
    onMute,
    onVolumeChange,
    onFullScreen,
    onSkipForward,
    onSkipBackward,
    onNextVideo,
    onPreviousVideo,
    onAutoplayToggle,
    onPlaybackSpeedChange,
    isPrevVideo,
    isNextVideo,
    onSeek,
    subtitles,
    selectedLanguage,
    onSubtitleSelect,
  }) => {
    const [isVolumeSliderVisible, setIsVolumeSliderVisible] = useState(false);
    const [showSubtitlesMenu, setShowSubtitlesMenu] = useState(false);
    const progress = (currentTime / duration) * 100 || 0;

    const handleCaptionClick = () => {
      setShowSubtitlesMenu(!showSubtitlesMenu);
    };

    const handleSubtitleSelect = (language, pathId) => {
      onSubtitleSelect(language, pathId);
      setShowSubtitlesMenu(false);
    };

    return (
      <div className="video-controls">
        <div className="progress-container">
          <div className="progress-bar">
            <div className="buffer-bar" style={{ width: `${buffered}%` }}></div>
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <input
            aria-label="Video position"
            className="progress-seek"
            max={duration || 0}
            min="0"
            onChange={(event) => onSeek(Number(event.target.value))}
            step="0.1"
            type="range"
            value={Math.min(currentTime, duration || 0)}
          />
        </div>
        <div className="controls-main">
          <div className="controls-left">
            <button
              aria-label="Previous lecture"
              onClick={onPreviousVideo}
              disabled={!isPrevVideo}
              style={{ opacity: isPrevVideo ? "" : "0.7" }}
              className="control-button previous-video"
              type="button"
            >
              <SkipPrevious />
            </button>
            <button
              aria-label="Skip backward"
              onClick={onSkipBackward}
              className="control-button skip-backward"
              type="button"
            >
              <Rewind />
            </button>
            <button
              aria-label={isPlaying ? "Pause" : "Play"}
              className="control-button play-pause"
              onClick={onPlayPause}
              type="button"
            >
              {isPlaying ? <Pause /> : <Play />}
            </button>
            <button
              aria-label="Skip forward"
              onClick={onSkipForward}
              className="control-button skip-forward"
              type="button"
            >
              <FastForward />
            </button>
            <button
              aria-label="Next lecture"
              onClick={isNextVideo ? onNextVideo : undefined}
              disabled={!isNextVideo}
              style={{ opacity: isNextVideo ? "" : "0.7" }}
              className="control-button skip-next"
              type="button"
            >
              <SkipNext />
            </button>
            <div
              className="volume-container"
              onMouseEnter={() => setIsVolumeSliderVisible(true)}
              onMouseLeave={() => setIsVolumeSliderVisible(false)}
            >
              <button
                aria-label={isMuted ? "Unmute" : "Mute"}
                className="control-button"
                onClick={onMute}
                type="button"
              >
                {isMuted ? (
                  <VolumeMuteSolid />
                ) : volume === 0 ? (
                  <VolumeMuteSolid />
                ) : volume < 0.5 ? (
                  <VolumeLowSolid />
                ) : (
                  <VolumeFullSolid />
                )}
              </button>
              <AnimatePresence>
                {isVolumeSliderVisible && (
                  <div className="volume-slider">
                    <motion.input
                      aria-label="Volume"
                      initial={{ width: 0 }}
                      animate={{ width: "5rem" }}
                      exit={{ width: 0 }}
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={(e) =>
                        onVolumeChange(parseFloat(e.target.value))
                      }
                    />
                  </div>
                )}
              </AnimatePresence>
            </div>
            <div className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
          <div className="controls-right">
            <button
              aria-label={isAutoplayOn ? "Disable autoplay" : "Enable autoplay"}
              className="control-button autoplay"
              onClick={onAutoplayToggle}
              type="button"
            >
              {isAutoplayOn ? <ToggleRight /> : <ToggleLeft />}
            </button>
            <div
              className="subtitles-container"
              style={{ position: "relative" }}
            >
              <button
                aria-label="Choose subtitles"
                onClick={handleCaptionClick}
                className="control-button caption"
                type="button"
              >
                {isCaptionOn ? <SolidCaptions /> : <Captions />}
              </button>
              <AnimatePresence>
                {showSubtitlesMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="subtitles-menu"
                  >
                    <button
                      className="subtitle-option"
                      style={{
                        padding: "4px 8px",
                        cursor: "pointer",
                        color: selectedLanguage === null ? "#fff" : "#ccc",
                        backgroundColor:
                          selectedLanguage === null
                            ? "rgba(255, 255, 255, 0.2)"
                            : "transparent",
                        borderRadius: "3px",
                        marginBottom: "5px",
                      }}
                      onClick={() => handleSubtitleSelect(null, null)}
                      type="button"
                    >
                      Off
                    </button>
                    {subtitles && subtitles.length > 0 ? (
                      subtitles.map((subtitle, index) => (
                        <button
                          key={index}
                          className="subtitle-option"
                          style={{
                            padding: "4px 8px",
                            cursor: "pointer",
                            color:
                              selectedLanguage === subtitle.language
                                ? "#fff"
                                : "#ccc",
                            backgroundColor:
                              selectedLanguage === subtitle.language
                                ? "rgba(255, 255, 255, 0.2)"
                                : "transparent",
                            borderRadius: "3px",
                            marginBottom: "5px",
                          }}
                          onClick={() =>
                            handleSubtitleSelect(
                              subtitle.language,
                              subtitle.pathId
                            )
                          }
                          type="button"
                        >
                          {subtitle.language}
                        </button>
                      ))
                    ) : (
                      <div
                        style={{
                          padding: "4px 8px",
                          color: "#ccc",
                          fontStyle: "italic",
                        }}
                      >
                        No subtitles available
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              aria-label={`Playback speed ${playbackSpeed} times`}
              onClick={() =>
                onPlaybackSpeedChange(
                  playbackSpeed >= 2 ? 0.5 : playbackSpeed + 0.5
                )
              }
              className="control-button playback-speed"
              type="button"
            >
              {playbackSpeed} X
            </button>
            <button
              aria-label={isFullScreen ? "Exit fullscreen" : "Enter fullscreen"}
              className="control-button"
              onClick={onFullScreen}
              type="button"
            >
              {isFullScreen ? <ExitFullscreen /> : <Fullscreen />}
            </button>
          </div>
        </div>
      </div>
    );
  }
);

const VideoPlayer = ({
  videoSource,
  onVideoEnd,
  onNextVideo,
  onPreviousVideo,
  onPlayRequest,
  isNextVideo,
  isPrevVideo,
  handleLectureCompleteOnVideoEnd,
  LectureId,
  CourseId,
  initialVideoProgress,
  subtitles,
  deflang,
}) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const previousTimeRef = useRef(0);
  const accumulatorRef = useRef(0);
  const seekThreshold = 1;
  const [state, setState] = useState({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    buffered: 0,
    volume: 1,
    isMuted: false,
    isCaptionOn: deflang ? true : false,
    isFullScreen: false,
    playbackSpeed: 1,
    isAutoplayOn: true,
    showControls: true,
    selectedLanguage: deflang || null,
  });

  const updateSubtitlePreference = async (language) => {
    try {
      await axios.post(
        "/api/course/subtitle/preference",
        {
          language,
        },
        { withCredentials: true }
      );
    } catch (error) {
      console.error("Failed to update subtitle preference:", error);
    }
  };

  const handleSubtitleSelect = useCallback(
    (language, pathId) => {
      const video = videoRef.current;
      if (!video) return;

      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = "disabled";
      }
      if (language && pathId) {
        const trackIndex = subtitles.findIndex(
          (sub) => sub.language === language
        );
        if (trackIndex !== -1 && trackIndex < video.textTracks.length) {
          video.textTracks[trackIndex].mode = "showing";
        }
      }
      updateSubtitlePreference(language);
      setState((prev) => ({
        ...prev,
        selectedLanguage: language,
        isCaptionOn: language !== null,
      }));
    },
    [subtitles, CourseId]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !subtitles.length) return;

    if (state.selectedLanguage) {
      const defaultSub = subtitles.find(
        (sub) => sub.language === state.selectedLanguage
      );
      if (defaultSub) {
        handleSubtitleSelect(defaultSub.language, defaultSub.pathId);
      }
    }
  }, [videoSource, subtitles, handleSubtitleSelect, state.isCaptionOn]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = async () => {
      if (onPlayRequest) {
        try {
          await video.play();
          setState((prev) => ({
            ...prev,
            isPlaying: true,
          }));
        } catch (error) {
          console.log("Play failed:", error);
        }
      }
    };

    video.addEventListener("canplay", handleCanPlay);
    if (video.readyState >= 3 && onPlayRequest) {
      handleCanPlay();
    }

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, [onPlayRequest, videoSource]);

  useEffect(() => {
    if (initialVideoProgress && videoRef.current) {
      videoRef.current.currentTime = initialVideoProgress;
    }
  }, [initialVideoProgress, videoSource]);

  const updateWatchTime = async (seconds, lectureId, courseId, progress) => {
    try {
      await axios.post(
        "/api/course/progress/watchtime",
        { seconds, lectureId, courseId, progress },
        { withCredentials: true }
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setState((prev) => ({
      ...prev,
      currentTime: video.currentTime,
    }));

    const currentTime = video.currentTime;
    const delta = currentTime - previousTimeRef.current;

    if (delta < 0) {
      previousTimeRef.current = currentTime;
      accumulatorRef.current = 0;
      return;
    }

    if (delta > seekThreshold) {
      previousTimeRef.current = currentTime;
      return;
    }

    accumulatorRef.current += delta;
    previousTimeRef.current = currentTime;

    if (accumulatorRef.current >= 5) {
      const currentPosition = currentTime;
      const watchedSeconds = 5;
      updateWatchTime(watchedSeconds, LectureId, CourseId, currentPosition);
      accumulatorRef.current %= 5;
    }
  }, [LectureId, CourseId]);

  const handleProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.buffered.length) return;

    let maxBufferedEnd = 0;
    for (let i = 0; i < video.buffered.length; i++) {
      maxBufferedEnd = Math.max(maxBufferedEnd, video.buffered.end(i));
    }

    const duration = video.duration;
    setState((prev) => ({
      ...prev,
      buffered: (maxBufferedEnd / duration) * 100,
    }));
  }, []);

  const handleSeek = useCallback((newTime) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = newTime;
  }, []);

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (state.isPlaying) {
      video.pause();
    } else {
      video.play();
    }

    setState((prev) => ({
      ...prev,
      isPlaying: !prev.isPlaying,
    }));
  }, [state.isPlaying]);

  const handleMouseMove = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showControls: true,
    }));

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    controlsTimeoutRef.current = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        showControls: false,
      }));
    }, 5000);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    setState((prev) => ({
      ...prev,
      showControls: false,
    }));
  }, []);

  const handleSkipForward = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(video.currentTime + 10, video.duration);
  }, []);

  const handleSkipBackward = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(video.currentTime - 10, 0);
  }, []);

  const handleVolumeChange = useCallback((newVolume) => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = newVolume;
    video.muted = newVolume === 0;

    setState((prev) => ({
      ...prev,
      volume: newVolume,
      isMuted: newVolume === 0,
    }));
  }, []);

  const handleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const newMutedState = !state.isMuted;
    video.muted = newMutedState;

    setState((prev) => ({
      ...prev,
      isMuted: newMutedState,
    }));
  }, [state.isMuted]);

  const handleFullScreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setState((prev) => ({
        ...prev,
        isFullScreen: true,
      }));
    } else {
      document.exitFullscreen();
      setState((prev) => ({
        ...prev,
        isFullScreen: false,
      }));
    }
  }, []);

  const handlePlaybackSpeedChange = useCallback((speed) => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = speed;
    setState((prev) => ({
      ...prev,
      playbackSpeed: speed,
    }));
  }, []);

  const handleAutoplayToggle = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isAutoplayOn: !prev.isAutoplayOn,
    }));
  }, []);

  const handleVideoEnd = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPlaying: false,
    }));

    handleLectureCompleteOnVideoEnd();

    if (state.isAutoplayOn && onVideoEnd) {
      onVideoEnd?.();
    }
  }, [state.isAutoplayOn, onVideoEnd, handleLectureCompleteOnVideoEnd]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVideoLoadedMetadata = () => {
      setState((prev) => ({
        ...prev,
        duration: video.duration,
      }));
      setTimeout(() => {
        for (let i = 0; i < video.textTracks.length; i++) {
          video.textTracks[i].mode = "disabled";
        }

        if (state.selectedLanguage) {
          const trackIndex = subtitles.findIndex(
            (sub) => sub.language === state.selectedLanguage
          );
          if (trackIndex !== -1 && trackIndex < video.textTracks.length) {
            video.textTracks[trackIndex].mode = "showing";
          }
        }
      }, 100);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("progress", handleProgress);
    video.addEventListener("ended", handleVideoEnd);
    video.addEventListener("loadedmetadata", handleVideoLoadedMetadata);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("ended", handleVideoEnd);
      video.removeEventListener("loadedmetadata", handleVideoLoadedMetadata);
    };
  }, [handleTimeUpdate, handleProgress, handleVideoEnd]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="video-player-container"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        src={videoSource}
        className="video-element"
        onClick={handlePlayPause}
        crossOrigin="use-credentials"
        key={`${videoSource}-${LectureId}`}
      >
        {subtitles && subtitles.length > 0
          ? subtitles.map((subtitle, index) => (
              <track
                key={subtitle.pathId}
                kind="subtitles"
                label={subtitle.cleanedName || subtitle.language}
                src={`/api/course/subtitle/${subtitle.pathId}`}
                srcLang={subtitle.language}
              />
            ))
          : null}
      </video>

      <AnimatePresence>
        {state.showControls && (
          <motion.div
            initial={{ y: 90 }}
            animate={{ y: 0 }}
            exit={{ y: 90 }}
            transition={{ type: "tween", ease: "easeInOut" }}
            className="controls-wrapper"
          >
            <Controls
              isPlaying={state.isPlaying}
              isMuted={state.isMuted}
              isCaptionOn={state.isCaptionOn}
              isFullScreen={state.isFullScreen}
              currentTime={state.currentTime}
              duration={state.duration}
              buffered={state.buffered}
              volume={state.volume}
              playbackSpeed={state.playbackSpeed}
              isAutoplayOn={state.isAutoplayOn}
              isNextVideo={isNextVideo}
              isPrevVideo={isPrevVideo}
              onPlayPause={handlePlayPause}
              onMute={handleMute}
              onVolumeChange={handleVolumeChange}
              onFullScreen={handleFullScreen}
              onSkipForward={handleSkipForward}
              onSkipBackward={handleSkipBackward}
              onNextVideo={onNextVideo}
              onPreviousVideo={onPreviousVideo}
              onAutoplayToggle={handleAutoplayToggle}
              onPlaybackSpeedChange={handlePlaybackSpeedChange}
              onSeek={handleSeek}
              subtitles={subtitles}
              selectedLanguage={state.selectedLanguage}
              onSubtitleSelect={handleSubtitleSelect}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default memo(VideoPlayer);
