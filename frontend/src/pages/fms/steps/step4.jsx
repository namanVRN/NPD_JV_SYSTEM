import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AssignLeadModal from "../../../components/AssignLeadModal.jsx";
import { toast } from "react-toastify";
import api from "../../../api.js";
import FilePreviewModal from "../../../components/Filepreviewmodal.jsx";
import RemarksSection from "../../../components/Remarkssection.jsx";

// Columns to display in table
const STEP4_COLUMNS = [
  { key: "enqNo", label: "EnQ No" },
  { key: "clientName", label: "Client Name" },
  { key: "partnerType", label: "Partner Type" },
  { key: "purpose", label: "Purpose" },
  { key: "location", label: "Location" },
  { key: "contactInfo", label: "Contact Info" },
  { key: "concernPerson", label: "Concern Person" },
  { key: "step4Planned", label: "Planned Date" },
];

const STATUS_OPTIONS = [
  {
    value: "Proposal on Progress",
    label: "Proposal on Progress",
    icon: "bi-arrow-repeat",
    color: "#f59e0b",
  },
  { value: "Done", label: "Done", icon: "bi-check-circle", color: "#22c55e" },
  {
    value: "Cold Lead",
    label: "Cold Lead",
    icon: "bi-snow2",
    color: "#3b82f6",
  },
  {
    value: "Back to Pipeline",
    label: "Back to Pipeline",
    icon: "bi-arrow-return-left",
    color: "#eab308",
  },
  {
    value: "Not Qualified Lead",
    label: "Not Qualified Lead",
    icon: "bi-x-circle",
    color: "#ef4444",
  },
];

const CAD_FILE_COL_INDEX = 28;

function getPreviewFiles(lead) {
  const files = [];
  if (lead.aks) files.push({ label: "AKS", link: lead.aks });
  if (lead.khasra) files.push({ label: "Khasra", link: lead.khasra });
  if (lead.oldDocument)
    files.push({ label: "Old Document", link: lead.oldDocument });
  if (lead.landSurvey)
    files.push({ label: "Land Survey", link: lead.landSurvey });
  if (lead.step4CadFile)
    files.push({ label: "CAD File", link: lead.step4CadFile });
  return files;
}

const styles = {
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modalContent: {
    backgroundColor: "var(--bg-primary, #ffffff)",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "560px",
    maxHeight: "90vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid var(--border-primary, #e5e7eb)",
    backgroundColor: "var(--bg-secondary, #f9fafb)",
  },
  modalTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 600,
    color: "var(--text-primary, #111827)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    color: "var(--text-secondary, #6b7280)",
    padding: "4px 8px",
    borderRadius: "6px",
    lineHeight: 1,
    transition: "background-color 0.2s",
  },
  modalBody: { padding: "20px", overflowY: "auto", flex: 1 },
  leadInfoCard: {
    backgroundColor: "var(--bg-tertiary, #f3f4f6)",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "20px",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid var(--border-secondary, #e5e7eb)",
  },
  infoRowLast: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
  },
  infoLabel: {
    fontSize: "13px",
    color: "var(--text-secondary, #6b7280)",
    fontWeight: 500,
  },
  infoValue: {
    fontSize: "14px",
    color: "var(--text-primary, #111827)",
    fontWeight: 500,
  },
  folderLink: {
    color: "#22c55e",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "14px",
    fontWeight: 500,
  },
  existingFilesCard: {
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    border: "1px solid rgba(59, 130, 246, 0.2)",
    borderRadius: "8px",
    padding: "14px",
    marginBottom: "20px",
  },
  existingFilesTitle: {
    marginBottom: "8px",
    fontSize: "13px",
    color: "var(--text-secondary, #6b7280)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  fileLinkRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 0",
    fontSize: "13px",
  },
  fileLinkLabel: { color: "var(--text-secondary, #6b7280)" },
  fileLinkValue: { color: "var(--text-primary, #111827)" },
  fileLinkAnchor: {
    color: "#3b82f6",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  formSection: { marginBottom: "16px" },
  sectionTitle: {
    marginBottom: "12px",
    color: "var(--text-primary, #111827)",
    fontSize: "15px",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  formGroup: { marginBottom: "16px" },
  label: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--text-primary, #111827)",
    marginBottom: "8px",
  },
  required: { color: "#ef4444" },
  formInput: {
    width: "100%",
    padding: "12px 14px",
    fontSize: "14px",
    border: "1px solid var(--border-primary, #d1d5db)",
    borderRadius: "8px",
    backgroundColor: "var(--bg-primary, #ffffff)",
    color: "var(--text-primary, #111827)",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  },
  formHint: {
    display: "block",
    fontSize: "12px",
    color: "var(--text-secondary, #6b7280)",
    marginTop: "6px",
  },
  btnSaveText: {
    backgroundColor: "#3b82f6",
    color: "white",
    padding: "10px 16px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    width: "100%",
    marginTop: "8px",
    fontSize: "14px",
    fontWeight: 500,
    transition: "background-color 0.2s",
  },
  divider: {
    border: "none",
    borderTop: "1px solid var(--border-primary, #e5e7eb)",
    margin: "20px 0",
  },
  fileUploads: { marginBottom: "16px" },
  fileUploadRow: { marginBottom: "12px" },
  fileLabel: {
    display: "block",
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--text-primary, #111827)",
    marginBottom: "8px",
  },
  fileInputWrapper: { display: "flex", alignItems: "center", gap: "8px" },
  fileInputHidden: { display: "none" },
  fileInputBtn: {
    flex: 1,
    padding: "12px 14px",
    fontSize: "14px",
    border: "1px dashed var(--border-primary, #d1d5db)",
    borderRadius: "8px",
    backgroundColor: "var(--bg-secondary, #f9fafb)",
    color: "var(--text-secondary, #6b7280)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "border-color 0.2s, background-color 0.2s",
  },
  fileClearBtn: {
    padding: "10px 12px",
    border: "1px solid var(--border-primary, #d1d5db)",
    borderRadius: "8px",
    backgroundColor: "var(--bg-primary, #ffffff)",
    color: "var(--text-secondary, #6b7280)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s",
  },
  btnUploadFiles: {
    backgroundColor: "#22c55e",
    color: "white",
    padding: "10px 16px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    width: "100%",
    fontSize: "14px",
    fontWeight: 500,
    transition: "background-color 0.2s",
  },
  statusOptions: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)", // Changed from 2 to 3
    gap: "10px",
  },
  statusOption: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px 16px",
    borderRadius: "8px",
    border: "2px solid var(--border-primary, #e5e7eb)",
    backgroundColor: "var(--bg-primary, #ffffff)",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--text-secondary, #6b7280)",
    transition: "all 0.2s",
  },
  nextStepPlannedGroup: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "16px",
  },
  warningBox: {
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
  },
  warningIcon: { fontSize: "18px", flexShrink: 0, marginTop: "2px" },
  modalFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "12px",
    padding: "16px 20px",
    borderTop: "1px solid var(--border-primary, #e5e7eb)",
    backgroundColor: "var(--bg-secondary, #f9fafb)",
  },
  btnCancel: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: 500,
    borderRadius: "8px",
    border: "1px solid var(--border-primary, #d1d5db)",
    backgroundColor: "var(--bg-primary, #ffffff)",
    color: "var(--text-primary, #374151)",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  btnPrimary: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: 500,
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#6366f1",
    color: "#ffffff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "background-color 0.2s",
  },
  btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
  spinnerSmall: {
    width: "16px",
    height: "16px",
    border: "2px solid rgba(255, 255, 255, 0.3)",
    borderTopColor: "#ffffff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};

const spinnerKeyframes = `@keyframes spin { to { transform: rotate(360deg); } }`;

function Step4Modal({ show, lead, onClose, onSuccess }) {
  const [status, setStatus] = useState("");
  const [plannedOverride, setPlannedOverride] = useState("");
  const [nextStepPlanned, setNextStepPlanned] = useState("");
  const [typeOfProject, setTypeOfProject] = useState("");
  const [calcLink, setCalcLink] = useState("");
  const [cadFile, setCadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [savingText, setSavingText] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const remarksRef = React.useRef(null);

  React.useEffect(() => {
    if (lead) {
      setTypeOfProject(lead.step4TypeOfProject || "");
      setCalcLink(lead.step4CalcLink || "");
    }
  }, [lead]);

  if (!show || !lead) return null;

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const getFileNames = (fileList) => {
    if (!fileList || fileList.length === 0) return "Choose File";
    if (fileList.length === 1) return fileList[0].name;
    return `${fileList.length} files selected`;
  };

  const handleSaveTextFields = async () => {
    if (!typeOfProject.trim() && !calcLink.trim()) {
      toast.warn("Please enter at least one text field to save");
      return;
    }
    setSavingText(true);
    try {
      await api.post("/fms/step4/save-text", {
        rowIndex: lead.rowIndex,
        enqNo: lead.enqNo,
        typeOfProject: typeOfProject.trim(),
        calcLink: calcLink.trim(),
      });
      toast.success("Text fields saved successfully!");
      onSuccess?.();
    } catch (err) {
      toast.error("Save failed: " + (err.response?.data?.error || err.message));
    } finally {
      setSavingText(false);
    }
  };

  const handleUploadCadFile = async () => {
    if (!cadFile || cadFile.length === 0) {
      toast.warn("Please select a CAD file to upload");
      return;
    }
    if (!lead.pdfFolder) {
      toast.error("Parent folder not found. Please complete Step 2 first.");
      return;
    }
    setUploading(true);
    try {
      for (let j = 0; j < cadFile.length; j++) {
        setUploadProgress(`Uploading CAD File (${j + 1}/${cadFile.length})...`);
        const base64 = await fileToBase64(cadFile[j]);
        await api.post("/fms/step4/upload", {
          rowIndex: lead.rowIndex,
          enqNo: lead.enqNo,
          columnIndex: CAD_FILE_COL_INDEX,
          fileName: cadFile[j].name,
          fileBase64: base64,
          mimeType: cadFile[j].type || "application/octet-stream",
          folderLink: lead.pdfFolder,
        });
      }
      toast.success("CAD file uploaded successfully!");
      setCadFile(null);
      onSuccess?.();
    } catch (err) {
      toast.error(
        "Upload failed: " + (err.response?.data?.error || err.message),
      );
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  const handleSubmitStatus = async () => {
    if (!status && !plannedOverride.trim()) {
      toast.warn("Please select a status or update planned date");
      return;
    }
    if (status === "Done" && !nextStepPlanned.trim()) {
      toast.warn("Please set the Next Step (Step 5) Planned Date");
      return;
    }
    if (status && status !== "Done") {
      if (
        !window.confirm(
          `Move this lead to ${status === "Back to Pipeline" ? "Pipeline" : status}?`,
        )
      )
        return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/fms/step4/update", {
        rowIndex: lead.rowIndex,
        enqNo: lead.enqNo,
        status: status || null,
        plannedOverride: plannedOverride.trim() || null,
        nextStepPlanned: nextStepPlanned.trim() || null,
      });
      if (res.data.success) {
        const remarkText = remarksRef.current?.getRemarkText() || "";
        if (remarkText.trim()) {
          await remarksRef.current.saveRemark(remarkText);
        }
        toast.success(res.data.message);
        onSuccess?.();
        onClose();
      } else {
        throw new Error(res.data.error || "Update failed");
      }
    } catch (err) {
      toast.error(
        "Update failed: " + (err.response?.data?.error || err.message),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStatus("");
    setPlannedOverride("");
    setNextStepPlanned("");
    setTypeOfProject("");
    setCalcLink("");
    setCadFile(null);
    onClose();
  };

  const isProcessing = uploading || savingText || submitting;

  const getStatusButtonStyle = (opt) => {
    const isSelected = status === opt.value;
    return {
      ...styles.statusOption,
      ...(isSelected && {
        borderColor: opt.color,
        backgroundColor: opt.color,
        color: "#ffffff",
      }),
      ...(isProcessing && styles.btnDisabled),
    };
  };

  return (
    <>
      <style>{spinnerKeyframes}</style>
      <div style={styles.modalOverlay} onClick={handleClose}>
        <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <h3 style={styles.modalTitle}>
              <i className="bi bi-clipboard-data"></i>Step 4: Conceptual Plan +
              Fill The Form
            </h3>
            <button
              style={{
                ...styles.closeBtn,
                ...(isProcessing && styles.btnDisabled),
              }}
              onClick={handleClose}
              disabled={isProcessing}
            >
              &times;
            </button>
          </div>

          <div style={styles.modalBody}>
            <div style={styles.leadInfoCard}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>EnQ No:</span>
                <span style={styles.infoValue}>{lead.enqNo}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Client:</span>
                <span style={styles.infoValue}>{lead.clientName}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Location:</span>
                <span style={styles.infoValue}>{lead.location}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Planned Date:</span>
                <span style={styles.infoValue}>{lead.step4Planned}</span>
              </div>
              {lead.pdfFolder && (
                <div style={styles.infoRowLast}>
                  <span style={styles.infoLabel}>Folder:</span>
                  <span style={styles.infoValue}>
                    <a
                      href={lead.pdfFolder}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.folderLink}
                    >
                      <i className="bi bi-folder2-open"></i> Open Drive Folder
                    </a>
                  </span>
                </div>
              )}
            </div>

            {(lead.step4TypeOfProject ||
              lead.step4CadFile ||
              lead.step4CalcLink) && (
              <div style={styles.existingFilesCard}>
                <h4 style={styles.existingFilesTitle}>
                  <i className="bi bi-info-circle"></i>Saved Data
                </h4>
                {lead.step4TypeOfProject && (
                  <div style={styles.fileLinkRow}>
                    <span style={styles.fileLinkLabel}>Type Of Project:</span>
                    <span style={styles.fileLinkValue}>
                      {lead.step4TypeOfProject}
                    </span>
                  </div>
                )}
                {lead.step4CadFile && (
                  <div style={styles.fileLinkRow}>
                    <span style={styles.fileLinkLabel}>CAD File:</span>
                    <a
                      href={lead.step4CadFile}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.fileLinkAnchor}
                    >
                      <i className="bi bi-box-arrow-up-right"></i> View
                    </a>
                  </div>
                )}
                {lead.step4CalcLink && (
                  <div style={styles.fileLinkRow}>
                    <span style={styles.fileLinkLabel}>Calculation Link:</span>
                    <span style={styles.fileLinkValue}>
                      {lead.step4CalcLink}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div style={styles.formSection}>
              <h4 style={styles.sectionTitle}>
                <i className="bi bi-pencil-square"></i>Project Details
              </h4>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <i className="bi bi-building"></i>Type Of Project
                </label>
                <input
                  type="text"
                  style={{
                    ...styles.formInput,
                    ...(isProcessing && styles.btnDisabled),
                  }}
                  placeholder="Enter project type (e.g., Residential, Commercial, Industrial)"
                  value={typeOfProject}
                  onChange={(e) => setTypeOfProject(e.target.value)}
                  disabled={isProcessing}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <i className="bi bi-link-45deg"></i>Calculation Link
                </label>
                <input
                  type="text"
                  style={{
                    ...styles.formInput,
                    ...(isProcessing && styles.btnDisabled),
                  }}
                  placeholder="Enter calculation link or reference"
                  value={calcLink}
                  onChange={(e) => setCalcLink(e.target.value)}
                  disabled={isProcessing}
                />
              </div>
              <button
                style={{
                  ...styles.btnSaveText,
                  ...((isProcessing ||
                    (!typeOfProject.trim() && !calcLink.trim())) &&
                    styles.btnDisabled),
                }}
                onClick={handleSaveTextFields}
                disabled={
                  isProcessing || (!typeOfProject.trim() && !calcLink.trim())
                }
              >
                {savingText ? (
                  <>
                    <span style={styles.spinnerSmall}></span> Saving...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2-circle"></i> Save Project Details
                  </>
                )}
              </button>
            </div>

            <hr style={styles.divider} />

            <div style={styles.fileUploads}>
              <h4 style={styles.sectionTitle}>
                <i className="bi bi-cloud-upload"></i>Upload CAD File
              </h4>
              <div style={styles.fileUploadRow}>
                <label style={styles.fileLabel}>CAD File of the Plan</label>
                <div style={styles.fileInputWrapper}>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setCadFile(e.target.files)}
                    disabled={isProcessing}
                    id="file-step4-cad"
                    style={styles.fileInputHidden}
                  />
                  <label htmlFor="file-step4-cad" style={styles.fileInputBtn}>
                    <i className="bi bi-upload"></i>
                    {getFileNames(cadFile)}
                  </label>
                  {cadFile && cadFile.length > 0 && (
                    <button
                      style={{
                        ...styles.fileClearBtn,
                        ...(isProcessing && styles.btnDisabled),
                      }}
                      onClick={() => setCadFile(null)}
                      disabled={isProcessing}
                    >
                      <i className="bi bi-x"></i>
                    </button>
                  )}
                </div>
              </div>
              <button
                style={{
                  ...styles.btnUploadFiles,
                  ...((isProcessing || !cadFile || cadFile.length === 0) &&
                    styles.btnDisabled),
                }}
                onClick={handleUploadCadFile}
                disabled={isProcessing || !cadFile || cadFile.length === 0}
              >
                {uploading ? (
                  <>
                    <span style={styles.spinnerSmall}></span> {uploadProgress}
                  </>
                ) : (
                  <>
                    <i className="bi bi-cloud-arrow-up"></i>Upload CAD File
                  </>
                )}
              </button>
            </div>

            <hr style={styles.divider} />

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <i className="bi bi-flag"></i>Status{" "}
                <span style={styles.required}>*</span>
              </label>
              <div style={styles.statusOptions}>
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    style={getStatusButtonStyle(opt)}
                    onClick={() => setStatus(opt.value)}
                    disabled={isProcessing}
                  >
                    <i className={`bi ${opt.icon}`}></i>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {status === "Done" && (
              <div style={styles.nextStepPlannedGroup}>
                <label style={styles.label}>
                  <i className="bi bi-calendar-plus"></i>Step 5 Planned Date &
                  Time <span style={styles.required}>*</span>
                </label>
                <input
                  type="datetime-local"
                  style={{
                    ...styles.formInput,
                    ...(isProcessing && styles.btnDisabled),
                  }}
                  value={nextStepPlanned}
                  onChange={(e) => setNextStepPlanned(e.target.value)}
                  disabled={isProcessing}
                />
                <small style={styles.formHint}>
                  This will be the Planned date for Step 5: Proposal
                </small>
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <i className="bi bi-calendar-event"></i>Planned Date Override
                (Optional)
              </label>
              <input
                type="datetime-local"
                style={styles.formInput}
                value={plannedOverride}
                onChange={(e) => setPlannedOverride(e.target.value)}
              />
              <small style={styles.formHint}>
                Leave empty to keep current planned date
              </small>
            </div>

            <RemarksSection
              ref={remarksRef}
              enqNo={lead.enqNo}
              stepName="Step 4: Proposal Preparation"
              disabled={isProcessing}
            />

            {status === "Proposal on Progress" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "12px 16px",
                  backgroundColor: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: "8px",
                  marginTop: "16px",
                  color: "#b45309",
                  fontSize: "14px",
                }}
              >
                <i className="bi bi-info-circle" style={styles.warningIcon}></i>
                <span>
                  Actual timestamp will be updated. Lead will{" "}
                  <strong>stay in Step 4</strong> for further updates (audit
                  trail).
                </span>
              </div>
            )}

            {status &&
              status !== "Done" &&
              status !== "Proposal on Progress" && (
                <div style={styles.warningBox}>
                  <i
                    className="bi bi-exclamation-triangle"
                    style={styles.warningIcon}
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

          <div style={styles.modalFooter}>
            <button
              style={{
                ...styles.btnCancel,
                ...(isProcessing && styles.btnDisabled),
              }}
              onClick={handleClose}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              style={{
                ...styles.btnPrimary,
                ...((isProcessing || (!status && !plannedOverride)) &&
                  styles.btnDisabled),
              }}
              onClick={handleSubmitStatus}
              disabled={isProcessing || (!status && !plannedOverride)}
            >
              {submitting ? (
                <>
                  <span style={styles.spinnerSmall}></span> Updating...
                </>
              ) : (
                <>
                  <i className="bi bi-check-lg"></i>Submit Status
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Step4({ currentUser, onNextAction }) {
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [previewLead, setPreviewLead] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // ✅ Assign Lead states
  const [assignLead, setAssignLead] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const queryClient = useQueryClient();

  // ✅ Admin check
  const isAdmin = currentUser?.role?.toLowerCase() === "admin";

  const { data, isLoading, error } = useQuery({
    queryKey: ["fms-step4"],
    queryFn: () => api.get("/fms/step4").then((r) => r.data),
    staleTime: 30000,
  });

  // ✅ Fetch latest assignments map
  const { data: latestData } = useQuery({
    queryKey: ["assignment-latest"],
    queryFn: async () => {
      const res = await api.get("/lead-assignment/latest");
      return res.data.latestByEnq || {};
    },
    staleTime: 30000,
  });

  const latestByEnq = latestData || {};
  const leads = data?.leads || [];

  const filteredLeads = leads.filter((lead) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (lead.enqNo || "").toLowerCase().includes(q) ||
      (lead.clientName || "").toLowerCase().includes(q) ||
      (lead.location || "").toLowerCase().includes(q) ||
      (lead.concernPerson || "").toLowerCase().includes(q)
    );
  });

  const handleAction = (lead) => {
    setSelectedLead(lead);
    setShowModal(true);
  };

  const handlePreview = (lead) => {
    setPreviewLead(lead);
    setShowPreview(true);
  };

  // ✅ Assign click handler
  const handleAssignClick = (lead) => {
    setAssignLead(lead);
    setShowAssignModal(true);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries(["fms-step4"]);
    queryClient.invalidateQueries(["fms-step5"]);
    queryClient.invalidateQueries(["pipeline"]);
    queryClient.invalidateQueries(["cold-leads"]);
    queryClient.invalidateQueries(["not-qualified"]);
  };

  return (
    <div className="step-content">
      <div className="filter-bar">
        <div className="search-box">
          <i className="bi bi-search"></i>
          <input
            type="text"
            className="filter-input"
            placeholder="Search by EnQ No, client, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch("")}>
              <i className="bi bi-x"></i>
            </button>
          )}
        </div>
        <span className="result-count">{filteredLeads.length} leads</span>
      </div>

      {error && (
        <div className="error-msg">
          <i className="bi bi-exclamation-triangle"></i>Failed to load:{" "}
          {error.message}
        </div>
      )}

      {isLoading ? (
        <div className="loading">
          <div className="spinner"></div>
          <span>Loading Step 4 leads...</span>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="empty-state">
          <i className="bi bi-inbox"></i>
          <p>No leads pending in Step 4</p>
          <small>
            Leads will appear here when Step 3 is complete and Step 4 Planned
            date is set
          </small>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="lead-table">
            <thead>
              <tr>
                {STEP4_COLUMNS.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
                {/* ✅ Assigned To column header */}
                <th>Assigned To</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => {
                // ✅ Get assigned user for this lead
                const assignedTo = latestByEnq[lead.enqNo]?.assignedTo || "";
                return (
                  <tr key={lead.enqNo}>
                    {STEP4_COLUMNS.map((col) => (
                      <td key={col.key}>{lead[col.key] || "—"}</td>
                    ))}

                    {/* ✅ Assigned To cell */}
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          cursor: isAdmin ? "pointer" : "default",
                        }}
                        onClick={(e) => {
                          if (isAdmin) {
                            e.stopPropagation();
                            handleAssignClick(lead);
                          }
                        }}
                      >
                        {assignedTo ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "3px 8px",
                              background: "rgba(99, 102, 241, 0.1)",
                              borderRadius: 6,
                              color: "#6366f1",
                              fontWeight: 600,
                              fontSize: 12,
                            }}
                          >
                            <i className="bi bi-person-check"></i>
                            {assignedTo}
                          </span>
                        ) : (
                          <span
                            style={{
                              color: "#9ca3af",
                              fontStyle: "italic",
                              fontSize: 12,
                            }}
                          >
                            Unassigned
                          </span>
                        )}
                        {isAdmin && (
                          <i
                            className="bi bi-pencil-square"
                            style={{ fontSize: 12, color: "#6b7280" }}
                          ></i>
                        )}
                      </div>
                    </td>

                    <td className="actions-cell">
                      {lead.pdfFolder && (
                        <button
                          className="btn btn-folder"
                          onClick={() => handlePreview(lead)}
                          title="Preview Files"
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                      )}
                      {onNextAction && (
                        <button
                          className="btn btn-nap"
                          onClick={() =>
                            onNextAction(lead, "FMS", "Step 4: Conceptual Plan")
                          }
                          title="Next Action Plan"
                        >
                          <i className="bi bi-ticket-perforated"></i>NAP
                        </button>
                      )}
                      <button
                        className="btn btn-action"
                        onClick={() => handleAction(lead)}
                        title="Update Step 4"
                      >
                        <i className="bi bi-pencil-square"></i>Action
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Step4Modal
        show={showModal}
        lead={selectedLead}
        onClose={() => {
          setShowModal(false);
          setSelectedLead(null);
        }}
        onSuccess={handleSuccess}
      />

      <FilePreviewModal
        show={showPreview}
        onClose={() => {
          setShowPreview(false);
          setPreviewLead(null);
        }}
        files={previewLead ? getPreviewFiles(previewLead) : []}
        folderLink={previewLead?.pdfFolder}
        title={
          previewLead
            ? `Files — ${previewLead.clientName} (${previewLead.enqNo})`
            : "Files"
        }
      />

      {/* ✅ Assign Lead Modal */}
      <AssignLeadModal
        show={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setAssignLead(null);
        }}
        lead={assignLead}
        stepName="Step 4: Conceptual Plan"
        currentUser={currentUser}
        currentAssignee={
          assignLead ? latestByEnq[assignLead.enqNo]?.assignedTo : ""
        }
      />
    </div>
  );
}
