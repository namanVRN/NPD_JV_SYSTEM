import React, { useState, useRef, useEffect } from "react";
import { toast } from "react-toastify";
import api from "../api.js";
import RemarksSection from "./Remarkssection.jsx";

const FILE_FIELDS = [
  { key: "aks", label: "Aks", colIndex: 14 },
  { key: "khasra", label: "Khasra", colIndex: 15 },
  { key: "oldDocument", label: "Any OLD Document/Layout Plan", colIndex: 16 },
  { key: "landSurvey", label: "Land Survey", colIndex: 17 },
];

// Status options
const STATUS_OPTIONS = [
  { value: "Done", label: "Done", icon: "bi-check-circle", color: "#22c55e" },
  { value: "Cold Lead", label: "Cold Lead", icon: "bi-snow2", color: "#3b82f6" },
  { value: "Back to Pipeline", label: "Back to Pipeline", icon: "bi-arrow-return-left", color: "#eab308" },
  { value: "Not Qualified Lead", label: "Not Qualified Lead", icon: "bi-x-circle", color: "#ef4444" },
];

export default function Step2Modal({ show, lead, onClose, onSuccess }) {
  const [status, setStatus] = useState("Done");
  const [mapLocation, setMapLocation] = useState("");
  const [files, setFiles] = useState({});
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const remarksRef = useRef(null);

  // ✅ Reset all local state when a different lead is opened
  useEffect(() => {
    if (lead) {
      setStatus("Done");
      setMapLocation("");
      setFiles({});
      setProgress("");
    }
  }, [lead?.enqNo]);

  if (!show || !lead) return null;

  const handleFileChange = (key, fileList) => {
    setFiles((prev) => ({ ...prev, [key]: fileList }));
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    // Clear files and map if status is not "Done"
    if (newStatus !== "Done") {
      setFiles({});
      setMapLocation("");
    }
  };

  const handleSubmit = async () => {
    // ============================================
    // Validation for "Done" status
    // ============================================
    if (status === "Done") {
      const selectedFiles = Object.entries(files).filter(
        ([_, fileList]) => fileList && fileList.length > 0,
      );

      if (selectedFiles.length === 0 && !mapLocation.trim()) {
        toast.warn(
          "Please provide Map Location link or upload at least one file",
        );
        return;
      }
    }

    // ============================================
    // Confirmation for move actions
    // ============================================
    if (status !== "Done") {
      const confirmMsg = `Are you sure you want to move this lead to ${status === "Back to Pipeline" ? "Pipeline" : status}?`;
      if (!window.confirm(confirmMsg)) return;
    }

    setUploading(true);

    try {
      // ============================================
      // CASE 1: Status = "Done" → Upload files
      // ============================================
      if (status === "Done") {
        setProgress("Creating folder...");
        const initRes = await api.post("/fms/step2/update", {
          rowIndex: lead.rowIndex,
          enqNo: lead.enqNo,
          location: lead.location,
          clientName: lead.clientName,
          mapLocation: mapLocation.trim(),
          status: "Done",
        });

        if (!initRes.data.success) {
          throw new Error(initRes.data.error || "Failed to initialize");
        }

        const folderId = initRes.data.folderId;

        // Upload each file
        const selectedFiles = Object.entries(files).filter(
          ([_, fileList]) => fileList && fileList.length > 0,
        );

        for (let i = 0; i < selectedFiles.length; i++) {
          const [key, fileList] = selectedFiles[i];
          const fieldInfo = FILE_FIELDS.find((f) => f.key === key);

          for (let j = 0; j < fileList.length; j++) {
            const file = fileList[j];
            setProgress(
              `Uploading ${fieldInfo.label} (${j + 1}/${fileList.length})...`,
            );

            const base64 = await fileToBase64(file);

            await api.post("/fms/upload", {
              rowIndex: lead.rowIndex,
              folderId: folderId,
              columnIndex: fieldInfo.colIndex,
              fileName: file.name,
              fileBase64: base64,
              mimeType: file.type || "application/octet-stream",
            });
          }
        }

        toast.success("Documents uploaded successfully!");
      }

      // ============================================
      // CASE 2: Status = "Cold Lead" / "Back to Pipeline" / "Not Qualified Lead"
      // ============================================
      else {
        setProgress(`Moving to ${status === "Back to Pipeline" ? "Pipeline" : status}...`);

        const remarkText = remarksRef.current?.getRemarkText() || "";

        const moveRes = await api.post("/fms/step2/update", {
          rowIndex: lead.rowIndex,
          enqNo: lead.enqNo,
          status: status,
          remark: remarkText.trim(),
        });

        if (!moveRes.data.success) {
          throw new Error(moveRes.data.error || "Failed to update status");
        }

        toast.success(moveRes.data.message);
      }

      // ============================================
      // Save remark if entered
      // ============================================
      const remarkText = remarksRef.current?.getRemarkText();
      if (remarkText && remarkText.trim()) {
        await remarksRef.current.saveRemark(remarkText);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Submit error:", err);
      toast.error(
        "Operation failed: " + (err.response?.data?.error || err.message),
      );
    } finally {
      setUploading(false);
      setProgress("");
    }
  };

  const getFileNames = (fileList) => {
    if (!fileList || fileList.length === 0) return "Choose Files";
    if (fileList.length === 1) return fileList[0].name;
    return `${fileList.length} files selected`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content step2-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>
            <i className="bi bi-cloud-upload" style={{ marginRight: 8 }}></i>
            Step 2: Document Upload
          </h3>
          <button className="close-btn" onClick={onClose} disabled={uploading}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          {/* Lead Info */}
          <div className="lead-info-card">
            <div className="info-row">
              <span className="info-label">EnQ No:</span>
              <span className="info-value">{lead.enqNo}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Client:</span>
              <span className="info-value">{lead.clientName}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Location:</span>
              <span className="info-value">{lead.location}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Planned Date:</span>
              <span className="info-value">{lead.planned}</span>
            </div>
          </div>

          {/* ✅ Status Selection - Grid Buttons */}
          <div className="form-group">
            <label>
              <i className="bi bi-flag" style={{ marginRight: 6 }}></i>
              Status
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "10px",
                marginTop: "8px",
              }}
            >
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleStatusChange(opt.value)}
                    disabled={uploading}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: `2px solid ${isSelected ? opt.color : "var(--border-primary, #e5e7eb)"}`,
                      backgroundColor: isSelected ? opt.color : "var(--bg-primary, #ffffff)",
                      color: isSelected ? "#ffffff" : "var(--text-secondary, #6b7280)",
                      cursor: uploading ? "not-allowed" : "pointer",
                      fontSize: "14px",
                      fontWeight: 500,
                      transition: "all 0.2s",
                      opacity: uploading ? 0.6 : 1,
                    }}
                  >
                    <i className={`bi ${opt.icon}`}></i>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ============================================ */}
          {/* Conditional: Show upload section only for "Done" */}
          {/* ============================================ */}
          {status === "Done" && (
            <>
              {/* Map Location */}
              <div className="form-group">
                <label>
                  <i className="bi bi-geo-alt" style={{ marginRight: 6 }}></i>
                  Map Location (Google Maps Link)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Paste Google Maps link here..."
                  value={mapLocation}
                  onChange={(e) => setMapLocation(e.target.value)}
                  disabled={uploading}
                />
              </div>

              {/* File Uploads */}
              <div className="file-uploads">
                <h4 style={{ marginBottom: 12, color: "var(--text-primary)" }}>
                  <i className="bi bi-file-earmark" style={{ marginRight: 6 }}></i>
                  Upload Documents (Any file type)
                </h4>

                {FILE_FIELDS.map((field) => (
                  <div key={field.key} className="file-upload-row">
                    <label className="file-label">{field.label}</label>
                    <div className="file-input-wrapper">
                      <input
                        type="file"
                        multiple
                        onChange={(e) =>
                          handleFileChange(field.key, e.target.files)
                        }
                        disabled={uploading}
                        id={`file-${field.key}`}
                      />
                      <label
                        htmlFor={`file-${field.key}`}
                        className="file-input-btn"
                      >
                        <i className="bi bi-upload"></i>
                        {getFileNames(files[field.key])}
                      </label>
                      {files[field.key] && files[field.key].length > 0 && (
                        <button
                          className="file-clear-btn"
                          onClick={() => handleFileChange(field.key, null)}
                          disabled={uploading}
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Progress */}
          {uploading && progress && (
            <div className="upload-progress">
              <div className="spinner-small"></div>
              <span>{progress}</span>
            </div>
          )}

          <RemarksSection
            ref={remarksRef}
            enqNo={lead.enqNo}
            stepName="Step 2: Document Upload"
            disabled={uploading}
          />

          {/* Warning for move actions */}
          {status !== "Done" && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "12px 16px",
                backgroundColor: "rgba(234, 179, 8, 0.1)",
                border: "1px solid rgba(234, 179, 8, 0.3)",
                borderRadius: "8px",
                marginTop: "16px",
                color: "#b45309",
                fontSize: "14px",
              }}
            >
              <i
                className="bi bi-exclamation-triangle"
                style={{ fontSize: "18px", flexShrink: 0, marginTop: "2px" }}
              ></i>
              <span>
                This will move the lead to{" "}
                <strong>
                  {status === "Back to Pipeline" ? "Pipeline" : status}
                </strong>{" "}
                and remove it from FMS.
              </span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-cancel"
            onClick={onClose}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <span className="spinner-small"></span> Processing...
              </>
            ) : (
              <>
                <i className="bi bi-check-lg" style={{ marginRight: 4 }}></i>
                {status === "Done" ? "Submit & Upload" : "Submit"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}