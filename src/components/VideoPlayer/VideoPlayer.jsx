import { AnimatePresence, motion } from "framer-motion";
import React, { useState, useRef, useCallback, memo, useEffect } from "react";
import axios from "../../api/axiosInstance";
import {
  Captions,
  Cog,
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
  if (!Number.isFinite(time) || time < 0) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

const formatBitrate = (bitrate) => {
  if (!bitrate) return "";
  if (bitrate >= 1000000) return `${(bitrate / 1000000).toFixed(1)} Mbps`;
  return `${Math.round(bitrate / 1000)} kbps`;
};

const getQualityLabel = (profile) => {
  if (!profile) return "Auto";
  if (profile.kind === "auto") return "Auto";
  if (profile.kind === "direct") return "Direct Play";
  if (profile.isOriginal) return "Original";
  return profile.label;
};

const getQualityButtonLabel = (selectedQuality, resolvedProfile) => {
  if (!selectedQuality) return "";
  if (selectedQuality === "auto") {
    return resolvedProfile ? `Auto (${resolvedProfile.label})` : "Auto";
  }
  return resolvedProfile ? getQualityLabel(resolvedProfile) : selectedQuality;
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
    qualities,
    selectedQuality,
    resolvedQuality,
    onQualitySelect,
  }) => {
    const [isVolumeSliderVisible, setIsVolumeSliderVisible] = useState(false);
    const [showSubtitlesMenu, setShowSubtitlesMenu] = useState(false);
    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const progress = (currentTime / duration) * 100 || 0;

    const handleProgressClick = (e) => {
      const progressBar = e.currentTarget;
      const rect = progressBar.getBoundingClientRect();
      const clickPosition = (e.clientX - rect.left) / rect.width;
      const newTime = clickPosition * duration;
      onSeek(newTime);
    };

    const handleCaptionClick = () => {
      setShowQualityMenu(false);
      setShowSubtitlesMenu(!showSubtitlesMenu);
    };

    const handleQualityClick = () => {
      setShowSubtitlesMenu(false);
      setShowQualityMenu(!showQualityMenu);
    };

    const handleSubtitleSelect = (language, pathId) => {
      onSubtitleSelect(language, pathId);
      setShowSubtitlesMenu(false);
    };

    const handleQualitySelect = (quality) => {
      onQualitySelect(quality);
      setShowQualityMenu(false);
    };

    const resolvedProfile = qualities?.find(
      (profile) => profile.id === resolvedQuality
    );

    return (
      <div className="video-controls">
        <div className="progress-container" onClick={handleProgressClick}>
          <div className="progress-bar">
            <div className="buffer-bar" style={{ width: `${buffered}%` }}></div>
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
        <div className="controls-main">
          <div className="controls-left">
            <div
              onClick={onPreviousVideo}
              style={{ opacity: isPrevVideo ? "" : "0.7" }}
              className="control-button previous-video"
            >
              <SkipPrevious />
            </div>
            <div
              onClick={onSkipBackward}
              className="control-button skip-backward"
            >
              <Rewind />
            </div>
            <div onClick={onPlayPause} className="control-button play-pause">
              {isPlaying ? <Pause /> : <Play />}
            </div>
            <div
              onClick={onSkipForward}
              className="control-button skip-forward"
            >
              <FastForward />
            </div>
            <div
              onClick={isNextVideo ? onNextVideo : undefined}
              style={{ opacity: isNextVideo ? "" : "0.7" }}
              className="control-button skip-next"
            >
              <SkipNext />
            </div>
            <div
              className="volume-container"
              onMouseEnter={() => setIsVolumeSliderVisible(true)}
              onMouseLeave={() => setIsVolumeSliderVisible(false)}
            >
              <div onClick={onMute} className="control-button">
                {isMuted ? (
                  <VolumeMuteSolid />
                ) : volume === 0 ? (
                  <VolumeMuteSolid />
                ) : volume < 0.5 ? (
                  <VolumeLowSolid />
                ) : (
                  <VolumeFullSolid />
                )}
              </div>
              <AnimatePresence>
                {isVolumeSliderVisible && (
                  <div className="volume-slider">
                    <motion.input
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
            {qualities && qualities.length > 0 && (
              <div className="quality-container">
                <div
                  onClick={handleQualityClick}
                  className="control-button quality"
                >
                  <Cog />
                  <span className="quality-button-label">
                    {getQualityButtonLabel(selectedQuality, resolvedProfile)}
                  </span>
                </div>
                <AnimatePresence>
                  {showQualityMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="quality-menu"
                    >
                      {qualities.map((profile) => (
                        <div
                          key={profile.id}
                          className={`quality-option ${
                            selectedQuality === profile.id ? "active" : ""
                          }`}
                          onClick={() => handleQualitySelect(profile.id)}
                        >
                          <span>{getQualityLabel(profile)}</span>
                          {profile.bitrate ? (
                            <span className="quality-bitrate">
                              {formatBitrate(profile.bitrate)}
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <div onClick={onAutoplayToggle} className="control-button autoplay">
              {isAutoplayOn ? <ToggleRight /> : <ToggleLeft />}
            </div>
            <div
              className="subtitles-container"
              style={{ position: "relative" }}
            >
              <div
                onClick={handleCaptionClick}
                className="control-button caption"
              >
                {isCaptionOn ? <SolidCaptions /> : <Captions />}
              </div>
              <AnimatePresence>
                {showSubtitlesMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="subtitles-menu"
                  >
                    <div
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
                    >
                      Off
                    </div>
                    {subtitles && subtitles.length > 0 ? (
                      subtitles.map((subtitle, index) => (
                        <div
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
                        >
                          {subtitle.language}
                        </div>
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
            <div
              onClick={() =>
                onPlaybackSpeedChange(
                  playbackSpeed >= 2 ? 0.5 : playbackSpeed + 0.5
                )
              }
              className="control-button playback-speed"
            >
              {playbackSpeed} X
            </div>
            <div onClick={onFullScreen} className="control-button">
              {isFullScreen ? <ExitFullscreen /> : <Fullscreen />}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

const standardQualityPattern = /^\d{3,4}p$/;

const isPresetProfile = (profile) =>
  profile.kind === "transcode" && !profile.isOriginal;

const resolvePreference = (preference, profiles) => {
  if (!profiles.length) return "direct";
  if (!preference) return "direct";

  const ids = new Set(profiles.map((profile) => profile.id));
  if (ids.has(preference)) return preference;

  if (standardQualityPattern.test(preference)) {
    const presets = profiles.filter(isPresetProfile);
    if (presets.length) return presets[0].id;
    return ids.has("original") ? "original" : "direct";
  }

  return ids.has("auto") ? "auto" : "direct";
};

const estimateBandwidth = () => {
  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;
  const downlink = Number(connection?.downlink);
  if (!Number.isFinite(downlink) || downlink <= 0) return 0;
  return downlink * 1000 * 1000;
};

const pickAutoProfile = (profiles) => {
  const presets = profiles.filter(isPresetProfile);
  if (!presets.length) {
    return (
      profiles.find((profile) => profile.kind === "transcode") ||
      profiles.find((profile) => profile.kind === "direct") ||
      null
    );
  }

  const bandwidth = estimateBandwidth();
  if (bandwidth > 0) {
    const affordable = presets.find(
      (profile) => profile.bitrate <= bandwidth * 0.7
    );
    return affordable || presets[presets.length - 1];
  }

  return presets.find((profile) => profile.id === "720p") || presets[0];
};

const resolveConcreteProfile = (requestedQuality, profiles, forcedId) => {
  if (forcedId) {
    const forced = profiles.find((profile) => profile.id === forcedId);
    if (forced) return forced;
  }

  if (requestedQuality === "auto") {
    return pickAutoProfile(profiles);
  }

  return (
    profiles.find((profile) => profile.id === requestedQuality) ||
    profiles.find((profile) => profile.kind === "direct") ||
    profiles[0]
  );
};

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
  defvideo,
  onVideoPreferenceChange,
  videoDuration,
}) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const previousTimeRef = useRef(0);
  const accumulatorRef = useRef(0);
  const sourceOffsetRef = useRef(0);
  const sourceDurationRef = useRef(videoDuration || 0);
  const qualitiesRef = useRef([]);
  const videoSrcRef = useRef(videoSource);
  const pendingSeekRef = useRef(null);
  const shouldResumeRef = useRef(false);
  const hasPlayedRef = useRef(false);
  const autoStateRef = useRef({ lastSwitch: 0, stallCount: 0, lastStall: 0 });
  const seekThreshold = 1;

  const [state, setState] = useState({
    isPlaying: false,
    currentTime: 0,
    duration: videoDuration || 0,
    buffered: 0,
    volume: 1,
    isMuted: false,
    isCaptionOn: deflang ? true : false,
    isFullScreen: false,
    playbackSpeed: 1,
    isAutoplayOn: true,
    showControls: true,
    selectedLanguage: deflang || null,
    lectureId: LectureId,
    videoSrc: defvideo && defvideo !== "direct" ? null : videoSource,
    sourceDuration: videoDuration || 0,
    quality: null,
    resolvedQuality: "direct",
    startOffset: 0,
    qualities: [],
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const updateVideoPreference = useCallback(
    async (quality) => {
      if (!quality) return;
      onVideoPreferenceChange?.(quality);
      try {
        await axios.post(
          "/api/course/video/preference",
          { quality },
          { withCredentials: true }
        );
      } catch (error) {
        console.error("Failed to update video quality preference:", error);
      }
    },
    [onVideoPreferenceChange]
  );

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

  const applyStream = useCallback(
    (requestedQuality, absoluteTime = 0, options = {}) => {
      const profiles = qualitiesRef.current;
      if (!profiles.length) return;

      const resolved = resolveConcreteProfile(
        requestedQuality,
        profiles,
        options.concreteId
      );
      if (!resolved) return;

      const duration = sourceDurationRef.current || videoDuration || 0;
      const target = Math.min(
        Math.max(absoluteTime || 0, 0),
        Math.max(duration - 0.25, 0)
      );
      const start = resolved.kind === "direct" ? 0 : target;
      const src =
        resolved.kind === "direct"
          ? `/api/course/stream/${LectureId}`
          : `/api/course/transcode/${LectureId}?profile=${encodeURIComponent(
              resolved.id
            )}&start=${start.toFixed(2)}`;

      const sameSource = src === videoSrcRef.current;
      const video = videoRef.current;

      videoSrcRef.current = src;
      sourceOffsetRef.current = start;
      previousTimeRef.current = target;
      autoStateRef.current.lastSwitch = Date.now();

      if (!sameSource) {
        shouldResumeRef.current =
          options.shouldPlay ?? (video ? !video.paused : false);
      }

      if (resolved.kind === "direct") {
        pendingSeekRef.current = target;
        if (sameSource && video && video.readyState >= 1) {
          if (target > 0 && Math.abs(video.currentTime - target) > 0.5) {
            video.currentTime = target;
          }
          pendingSeekRef.current = null;
        }
      } else {
        pendingSeekRef.current = null;
      }

      setState((prev) => ({
        ...prev,
        lectureId: LectureId,
        videoSrc: src,
        quality: requestedQuality,
        resolvedQuality: resolved.id,
        startOffset: start,
        currentTime: target,
        buffered: 0,
        sourceDuration: duration || prev.sourceDuration,
        duration: duration || prev.duration,
      }));

      if (options.persist && requestedQuality) {
        updateVideoPreference(requestedQuality);
      }
    },
    [LectureId, videoDuration, updateVideoPreference]
  );

  useEffect(() => {
    let cancelled = false;

    const loadQualities = async () => {
      try {
        const response = await axios.get(`/api/course/qualities/${LectureId}`, {
          withCredentials: true,
        });
        if (cancelled) return;

        const profiles = response.data.profiles || [];
        const duration =
          Number(response.data.source?.duration) || videoDuration || 0;
        qualitiesRef.current = profiles;
        sourceDurationRef.current = duration;

        const preference = resolvePreference(defvideo, profiles);
        setState((prev) => ({
          ...prev,
          qualities: profiles,
          sourceDuration: duration,
          duration: duration || prev.duration,
        }));

        const resumeAt =
          initialVideoProgress > 0 && initialVideoProgress < duration - 1
            ? initialVideoProgress
            : 0;
        applyStream(preference, resumeAt, { persist: false });
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load video qualities:", error);
        const fallbackDuration = videoDuration || 0;
        const resumeAt =
          initialVideoProgress > 0 && initialVideoProgress < fallbackDuration - 1
            ? initialVideoProgress
            : 0;
        qualitiesRef.current = [];
        sourceDurationRef.current = fallbackDuration;
        videoSrcRef.current = videoSource;
        sourceOffsetRef.current = 0;
        pendingSeekRef.current = resumeAt || null;
        if (
          resumeAt > 0 &&
          videoRef.current &&
          videoRef.current.readyState >= 1
        ) {
          videoRef.current.currentTime = resumeAt;
          pendingSeekRef.current = null;
        }
        setState((prev) => ({
          ...prev,
          qualities: [],
          quality: "direct",
          resolvedQuality: "direct",
          videoSrc: videoSource,
          startOffset: 0,
          currentTime: resumeAt,
          sourceDuration: videoDuration || prev.sourceDuration,
        }));
      }
    };

    loadQualities();

    return () => {
      cancelled = true;
    };
  }, [LectureId]);

  useEffect(() => {
    previousTimeRef.current = 0;
    accumulatorRef.current = 0;
    pendingSeekRef.current = null;
    shouldResumeRef.current = false;
    hasPlayedRef.current = false;
    sourceOffsetRef.current = 0;
    sourceDurationRef.current = videoDuration || 0;
    videoSrcRef.current =
      defvideo && defvideo !== "direct" ? null : videoSource;
    qualitiesRef.current = [];
    autoStateRef.current = { lastSwitch: 0, stallCount: 0, lastStall: 0 };
    setState((prev) => ({
      ...prev,
      currentTime: 0,
      buffered: 0,
      duration: videoDuration || 0,
      sourceDuration: videoDuration || 0,
      isPlaying: false,
      lectureId: LectureId,
      videoSrc: defvideo && defvideo !== "direct" ? null : videoSource,
      quality: null,
      resolvedQuality: "direct",
      startOffset: 0,
      qualities: [],
    }));
  }, [LectureId]);

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

    const timer = setTimeout(() => {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = "disabled";
      }

      const current = stateRef.current;
      if (current?.selectedLanguage) {
        const trackIndex = subtitles.findIndex(
          (sub) => sub.language === current.selectedLanguage
        );
        if (trackIndex !== -1 && trackIndex < video.textTracks.length) {
          video.textTracks[trackIndex].mode = "showing";
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [state.startOffset, subtitles, state.selectedLanguage]);

  const lastPlayRequestRef = useRef(onPlayRequest);

  useEffect(() => {
    const becameRequested = onPlayRequest && !lastPlayRequestRef.current;
    lastPlayRequestRef.current = onPlayRequest;
    if (!becameRequested) return;

    hasPlayedRef.current = false;
    const video = videoRef.current;
    if (!video || video.readyState < 3) return;

    shouldResumeRef.current = true;
    video.play().catch((error) => {
      console.log("Play failed:", error);
    });
  }, [onPlayRequest]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = async () => {
      if (
        shouldResumeRef.current ||
        (onPlayRequest && !hasPlayedRef.current)
      ) {
        try {
          await video.play();
          shouldResumeRef.current = false;
          hasPlayedRef.current = true;
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
    if (
      video.readyState >= 3 &&
      (shouldResumeRef.current || (onPlayRequest && !hasPlayedRef.current))
    ) {
      handleCanPlay();
    }

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, [onPlayRequest, LectureId]);

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

  const autoStep = useCallback(
    (direction) => {
      const current = stateRef.current;
      if (!current || current.quality !== "auto") return;

      const presets = qualitiesRef.current.filter(isPresetProfile);
      if (!presets.length) return;

      let index = presets.findIndex(
        (profile) => profile.id === current.resolvedQuality
      );
      if (index === -1) index = 0;

      const nextIndex =
        direction === "down"
          ? Math.min(index + 1, presets.length - 1)
          : Math.max(index - 1, 0);
      if (nextIndex === index) return;

      const video = videoRef.current;
      const absolute = sourceOffsetRef.current + (video?.currentTime || 0);
      applyStream("auto", absolute, {
        concreteId: presets[nextIndex].id,
        shouldPlay: video ? !video.paused : false,
        persist: false,
      });
    },
    [applyStream]
  );

  const autoStepRef = useRef(autoStep);
  useEffect(() => {
    autoStepRef.current = autoStep;
  }, [autoStep]);

  const handleStall = useCallback(() => {
    const current = stateRef.current;
    if (!current || current.quality !== "auto") return;

    const now = Date.now();
    const auto = autoStateRef.current;
    if (now - auto.lastStall > 15000) {
      auto.stallCount = 0;
    }
    auto.lastStall = now;
    auto.stallCount += 1;

    if (auto.stallCount >= 2 && now - auto.lastSwitch > 5000) {
      auto.stallCount = 0;
      auto.lastSwitch = now;
      autoStepRef.current?.("down");
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const absolute = sourceOffsetRef.current + video.currentTime;

    setState((prev) => ({
      ...prev,
      currentTime: absolute,
    }));

    const currentTime = absolute;
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

    const auto = autoStateRef.current;
    if (
      stateRef.current?.quality === "auto" &&
      Date.now() - auto.lastSwitch > 45000
    ) {
      const bufferedEnd = video.buffered.length
        ? video.buffered.end(video.buffered.length - 1)
        : 0;
      if (bufferedEnd - video.currentTime > 15) {
        auto.lastSwitch = Date.now();
        autoStepRef.current?.("up");
      }
    }
  }, [LectureId, CourseId]);

  const handleProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.buffered.length) return;

    let maxBufferedEnd = 0;
    for (let i = 0; i < video.buffered.length; i++) {
      maxBufferedEnd = Math.max(maxBufferedEnd, video.buffered.end(i));
    }

    const duration =
      sourceDurationRef.current || stateRef.current?.sourceDuration || 0;
    const absoluteBuffered = sourceOffsetRef.current + maxBufferedEnd;

    setState((prev) => ({
      ...prev,
      buffered: duration
        ? Math.min(100, (absoluteBuffered / duration) * 100)
        : 0,
    }));
  }, []);

  const handleSeek = useCallback(
    (newTime) => {
      const video = videoRef.current;
      if (!video) return;

      const duration = sourceDurationRef.current || video.duration || 0;
      const target = Math.min(
        Math.max(newTime, 0),
        Math.max(duration - 0.1, 0)
      );
      const current = stateRef.current;

      if (current?.resolvedQuality === "direct") {
        pendingSeekRef.current = null;
        previousTimeRef.current = target;
        video.currentTime = target;
        setState((prev) => ({ ...prev, currentTime: target }));
        return;
      }

      const offset = sourceOffsetRef.current;
      const bufferedEnd =
        offset +
        (video.buffered.length
          ? video.buffered.end(video.buffered.length - 1)
          : 0);
      const canSeekLocally =
        video.readyState >= 1 &&
        target >= offset - 0.25 &&
        target <= bufferedEnd + 2;

      if (canSeekLocally) {
        previousTimeRef.current = target;
        video.currentTime = Math.max(0, target - offset);
        setState((prev) => ({ ...prev, currentTime: target }));
        return;
      }

      const shouldPlay = !video.paused;
      applyStream(current?.quality || "auto", target, { shouldPlay });
    },
    [applyStream]
  );

  const handleQualitySelect = useCallback(
    (quality) => {
      const video = videoRef.current;
      const absolute = sourceOffsetRef.current + (video?.currentTime || 0);
      applyStream(quality, absolute, {
        persist: true,
        shouldPlay: video ? !video.paused : false,
      });
    },
    [applyStream]
  );

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
    const duration = sourceDurationRef.current || video.duration || 0;
    const current = sourceOffsetRef.current + video.currentTime;
    handleSeek(Math.min(current + 10, duration));
  }, [handleSeek]);

  const handleSkipBackward = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const current = sourceOffsetRef.current + video.currentTime;
    handleSeek(Math.max(current - 10, 0));
  }, [handleSeek]);

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
      const duration =
        sourceDurationRef.current || videoDuration || video.duration || 0;

      setState((prev) => ({
        ...prev,
        duration,
        isPlaying: !video.paused,
      }));

      if (
        pendingSeekRef.current !== null &&
        stateRef.current?.resolvedQuality === "direct"
      ) {
        const target = Math.min(
          pendingSeekRef.current,
          Math.max(duration - 0.1, 0)
        );
        if (Math.abs(video.currentTime - target) > 0.5) {
          video.currentTime = target;
        }
        pendingSeekRef.current = null;
      }

      previousTimeRef.current = sourceOffsetRef.current + video.currentTime;

      setTimeout(() => {
        for (let i = 0; i < video.textTracks.length; i++) {
          video.textTracks[i].mode = "disabled";
        }

        const current = stateRef.current;
        if (current?.selectedLanguage) {
          const trackIndex = subtitles.findIndex(
            (sub) => sub.language === current.selectedLanguage
          );
          if (trackIndex !== -1 && trackIndex < video.textTracks.length) {
            video.textTracks[trackIndex].mode = "showing";
          }
        }
      }, 100);
    };

    const handlePlay = () => {
      hasPlayedRef.current = true;
      setState((prev) => ({
        ...prev,
        isPlaying: true,
      }));
    };

    const handlePause = () => {
      setState((prev) => ({
        ...prev,
        isPlaying: false,
      }));
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("progress", handleProgress);
    video.addEventListener("ended", handleVideoEnd);
    video.addEventListener("loadedmetadata", handleVideoLoadedMetadata);
    video.addEventListener("waiting", handleStall);
    video.addEventListener("stalled", handleStall);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("ended", handleVideoEnd);
      video.removeEventListener("loadedmetadata", handleVideoLoadedMetadata);
      video.removeEventListener("waiting", handleStall);
      video.removeEventListener("stalled", handleStall);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [
    handleTimeUpdate,
    handleProgress,
    handleVideoEnd,
    handleStall,
    subtitles,
    videoDuration,
  ]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const resolvedProfile = state.qualities.find(
    (profile) => profile.id === state.resolvedQuality
  );
  const waitsForTranscode = defvideo && defvideo !== "direct";
  const streamSrc =
    state.lectureId === LectureId
      ? state.videoSrc
      : waitsForTranscode
        ? null
        : videoSource;

  return (
    <div
      ref={containerRef}
      className="video-player-container"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        src={streamSrc}
        className="video-element"
        onClick={handlePlayPause}
        crossOrigin="use-credentials"
        key={LectureId}
      >
        {subtitles && subtitles.length > 0
          ? subtitles.map((subtitle) => (
              <track
                key={`${subtitle.pathId}-${state.startOffset.toFixed(2)}`}
                kind="subtitles"
                label={subtitle.cleanedName || subtitle.language}
                src={`/api/course/subtitle/${subtitle.pathId}${
                  state.startOffset > 0
                    ? `?start=${state.startOffset.toFixed(2)}`
                    : ""
                }`}
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
              qualities={state.qualities}
              selectedQuality={state.quality}
              resolvedQuality={resolvedProfile?.id || state.resolvedQuality}
              onQualitySelect={handleQualitySelect}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default memo(VideoPlayer);
