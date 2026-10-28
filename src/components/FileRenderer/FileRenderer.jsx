import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FileArchiveSolid,
  FileBlankSolid,
  Html,
  FilePdfSolid,
  World,
} from "../../assets";
import { createSandboxedHtml } from "../../utils/sandboxHtml.js";

const FileRenderer = ({ fileType, fileSrc, fileName }) => {
  const [isHtmlRenderingRequested, setIsHtmlRenderingRequested] =
    useState(false);
  const [htmlContent, setHtmlContent] = useState(null);
  const [loadingHtml, setLoadingHtml] = useState(false);
  const [htmlError, setHtmlError] = useState(null);

  useEffect(() => {
    const fetchHtmlContent = async () => {
      if (
        isHtmlRenderingRequested &&
        fileType?.toLowerCase() === "html" &&
        fileSrc
      ) {
        setLoadingHtml(true);
        setHtmlError(null);
        try {
          const response = await axios.get(fileSrc, {
            withCredentials: true,
          });
          setHtmlContent(response.data);
        } catch (error) {
          setHtmlError(error);
          setHtmlContent(null);
        } finally {
          setLoadingHtml(false);
        }
      } else {
        setHtmlContent(null);
      }
    };

    fetchHtmlContent();
  }, [isHtmlRenderingRequested, fileType, fileSrc]);
  const handleRenderHtml = () => {
    setIsHtmlRenderingRequested(true);
  };

  const handleDownloadHtml = () => {
    const link = document.createElement("a");
    link.href = fileSrc;
    link.download = fileName || "html-file.html";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderContent = () => {
    switch (fileType?.toLowerCase()) {
      case "html":
        if (!isHtmlRenderingRequested) {
          return (
            <div className="file-container">
              <p className="file-container-file-name">
                {fileName || "HTML File"}
              </p>
              <p className="file-container-security-note">
                HTML files can contain scripts. For security, rendering is not
                automatic.
              </p>
              <p className="file-container-security-note">
                <strong>Warning:</strong> Rendering HTML directly can be a
                security risk if the source is untrusted. Ensure the HTML
                content is from a safe and reliable source before rendering it.
              </p>
              <div className="file-container-button-group">
                <button
                  className="file-container-action-button"
                  onClick={handleRenderHtml}
                  disabled={loadingHtml}
                >
                  {loadingHtml ? "Rendering..." : "Render HTML"}
                </button>
                <button
                  className="file-container-action-button"
                  onClick={handleDownloadHtml}
                  disabled={loadingHtml}
                >
                  Download HTML
                </button>
              </div>
              {htmlError && (
                <p className="file-container-error-text">
                  Error loading HTML: {htmlError.message}
                </p>
              )}
            </div>
          );
        } else if (htmlError) {
          return (
            <div className="file-container">
              <p className="file-container-file-name">
                {fileName || "HTML File"}
              </p>
              <p className="file-container-error-text">
                Error loading HTML: {htmlError.message}
              </p>
              <button
                className="file-container-action-button"
                onClick={() => setIsHtmlRenderingRequested(false)}
              >
                Back to Options
              </button>
            </div>
          );
        } else if (loadingHtml) {
          return (
            <div className="file-container">
              <p className="file-container-file-name">
                {fileName || "HTML File"}
              </p>
              <p>Rendering HTML content...</p>
            </div>
          );
        } else if (htmlContent) {
          return (
            <div className="file-container">
              <div className="html-file-container">
                <p className="file-container-html-warning">
                  <Html />
                  HTML File Preview:
                </p>

                <iframe
                  className="file-container-iframe"
                  srcDoc={createSandboxedHtml(htmlContent)}
                  sandbox=""
                  referrerPolicy="no-referrer"
                  title={`${fileName || "HTML File"} preview`}
                />
              </div>
              <div className="file-container-button-group">
                <button
                  className="file-container-action-button"
                  onClick={handleDownloadHtml}
                >
                  Download HTML
                </button>
                <button
                  className="file-container-action-button"
                  onClick={() => setIsHtmlRenderingRequested(false)}
                >
                  Back to Options
                </button>
              </div>
            </div>
          );
        }
        return null;

      case "zip":
        return (
          <div className="file-container">
            <span className="file-container-file-name">
              <FileArchiveSolid /> {fileName || "Download Zip File"}
            </span>
            <div className="file-container-download-button-container">
              <a
                href={fileSrc}
                download
                className="file-container-download-button"
              >
                Download ZIP
              </a>
            </div>
          </div>
        );

      case "pdf":
        return (
          <div className="file-container">
            <p className="file-container-pdf-title">
              <div className="file-container-pdf-title-left">
                <FilePdfSolid /> PDF File Preview:
              </div>
              <span className="file-container-pdf-fallback-text">
                If you are unable to view the PDF, you can{" "}
                <a href={fileSrc} download>
                  download it
                </a>
                .
              </span>
            </p>
            <iframe
              src={fileSrc}
              className="file-container-iframe"
              title="PDF Viewer"
            ></iframe>
          </div>
        );

      case "url":
        return (
          <div className="file-container">
            <span className="file-container-file-name">
              <World /> {fileName || "Open Link"}
            </span>
            <div className="file-container-url-icon-container">
              <span
                className="file-container-url-icon"
                onClick={() => window.open(fileSrc, "_blank")}
                title={`Open URL in new window: ${fileSrc}`}
              >
                Open Link
              </span>
            </div>
            <p className="file-container-url-text">{fileSrc}</p>
          </div>
        );

      default:
        return (
          <div className="file-container">
            <span className="file-container-file-name">
              <FileBlankSolid />
              {fileName || "Download File"}
            </span>
            <a
              href={fileSrc}
              download
              className="file-container-download-button"
            >
              Download File
            </a>
          </div>
        );
    }
  };

  return <>{renderContent()}</>;
};

export default FileRenderer;
