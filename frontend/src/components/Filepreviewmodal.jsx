import React, { useState } from "react";

// Extract file ID from Google Drive link
function extractFileId(link) {
  if (!link) return null;
  // Format: https://drive.google.com/file/d/FILE_ID/view
  const match = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// Extract folder ID from Google Drive folder link
function extractFolderId(link) {
  if (!link) return null;
  const match = link.match(/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export default function FilePreviewModal({ show, onClose, files, folderLink, title }) {
  const [activeFile, setActiveFile] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!show) return null;

  // files = [{ label: "AKS", link: "https://drive.google.com/file/d/.../view" }, ...]
  const validFiles = (files || []).filter((f) => f.link && extractFileId(f.link));

  const handleFileClick = (file) => {
    setLoading(true);
    setActiveFile(file);
  };

  const handleClose = () => {
    setActiveFile(null);
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content file-preview-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>
            <i className="bi bi-folder2-open" style={{ marginRight: 8 }}></i>
            {title || "Uploaded Files"}
          </h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {folderLink && (
              <a
                href={folderLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-open-drive"
                title="Open in Google Drive"
              >
                <i className="bi bi-box-arrow-up-right"></i>
                Drive
              </a>
            )}
            <button className="close-btn" onClick={handleClose}>
              &times;
            </button>
          </div>
        </div>

        <div className="file-preview-body">
          {/* File Tabs */}
          {validFiles.length > 0 ? (
            <div className="file-tabs-bar">
              {validFiles.map((file, idx) => (
                <button
                  key={idx}
                  className={`file-tab ${activeFile?.link === file.link ? "active" : ""}`}
                  onClick={() => handleFileClick(file)}
                  title={file.label}
                >
                  <i className={`bi ${getFileIcon(file.label)}`}></i>
                  <span>{file.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "40px 20px" }}>
              <i className="bi bi-file-earmark-x"></i>
              <p>No files uploaded yet</p>
            </div>
          )}

          {/* Preview Area */}
          {activeFile ? (
            <div className="file-preview-area">
              {loading && (
                <div className="file-preview-loading">
                  <div className="spinner"></div>
                  <span>Loading preview...</span>
                </div>
              )}
              <iframe
                src={`https://drive.google.com/file/d/${extractFileId(activeFile.link)}/preview`}
                className="file-preview-iframe"
                title={activeFile.label}
                onLoad={() => setLoading(false)}
                allow="autoplay"
              />
            </div>
          ) : validFiles.length > 0 ? (
            <div className="file-preview-placeholder">
              <i className="bi bi-eye"></i>
              <p>Select a file above to preview</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Get icon based on file label/type
function getFileIcon(label) {
  const l = (label || "").toLowerCase();
  if (l.includes("cad") || l.includes("plan")) return "bi-rulers";
  if (l.includes("pdf") || l.includes("document") || l.includes("old")) return "bi-file-earmark-pdf";
  if (l.includes("map") || l.includes("location") || l.includes("survey")) return "bi-geo-alt";
  if (l.includes("aks") || l.includes("khasra")) return "bi-file-earmark-text";
  if (l.includes("calculation") || l.includes("calc")) return "bi-calculator";
  if (l.includes("type") || l.includes("project")) return "bi-building";
  return "bi-file-earmark";
}