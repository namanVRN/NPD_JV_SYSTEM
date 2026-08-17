import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import api from "../../../api.js";

const STEP3_COLUMNS = [
  { key: "enqNo", label: "EnQ No" },
  { key: "clientName", label: "Client Name" },
  { key: "partnerType", label: "Partner Type" },
  { key: "purpose", label: "Purpose" },
  { key: "location", label: "Location" },
  { key: "contactInfo", label: "Contact Info" },
  { key: "concernPerson", label: "Concern Person" },
  { key: "step3Planned", label: "Planned Date" },
];

// ============ INLINE STYLES ============
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
    maxWidth: "500px",
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
  modalBody: {
    padding: "20px",
    overflowY: "auto",
    flex: 1,
  },
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
  formGroup: {
    marginBottom: "20px",
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--text-primary, #111827)",
    marginBottom: "8px",
  },
  statusOptions: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "10px",
  },
  statusOptionDone: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px 16px",
    borderRadius: "8px",
    border: "2px solid #22c55e",
    backgroundColor: "#22c55e",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "default",
  },
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
  twoColGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
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
    backgroundColor: "#22c55e",
    color: "#ffffff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "background-color 0.2s",
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  spinnerSmall: {
    width: "16px",
    height: "16px",
    border: "2px solid rgba(255, 255, 255, 0.3)",
    borderTopColor: "#ffffff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};

// Add keyframes for spinner animation
const spinnerKeyframes = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

function SvStep3Modal({ show, lead, onClose, onSuccess }) {
  const [plannedOverride, setPlannedOverride] = useState("");
  const [googleMap, setGoogleMap] = useState("");
  const [photos, setPhotos] = useState("");
  const [transport, setTransport] = useState("");
  const [distance, setDistance] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!show || !lead) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.post("/site-visit/fms/step3/update", {
        rowIndex: lead.rowIndex,
        enqNo: lead.enqNo,
        status: "Done",
        plannedOverride: plannedOverride.trim() || null,
        googleMap: googleMap.trim() || null,
        photos: photos.trim() || null,
        transport: transport.trim() || null,
        distance: distance.trim() || null,
        amount: amount.trim() || null,
      });
      if (res.data.success) {
        toast.success(res.data.message);
        onSuccess?.();
        onClose();
      } else {
        throw new Error(res.data.error);
      }
    } catch (err) {
      toast.error("Update failed: " + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setPlannedOverride("");
    setGoogleMap("");
    setPhotos("");
    setTransport("");
    setDistance("");
    setAmount("");
    onClose();
  };

  return (
    <>
      {/* Inject keyframes */}
      <style>{spinnerKeyframes}</style>

      <div style={styles.modalOverlay} onClick={handleClose}>
        <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div style={styles.modalHeader}>
            <h3 style={styles.modalTitle}>
              <i className="bi bi-binoculars"></i>
              Step 3: Land Observations
            </h3>
            <button
              style={{ ...styles.closeBtn, ...(submitting && styles.btnDisabled) }}
              onClick={handleClose}
              disabled={submitting}
            >
              &times;
            </button>
          </div>

          {/* Body */}
          <div style={styles.modalBody}>
            {/* Lead Info Card */}
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
              <div style={styles.infoRowLast}>
                <span style={styles.infoLabel}>Planned Date:</span>
                <span style={styles.infoValue}>{lead.step3Planned}</span>
              </div>
            </div>

            {/* Status (Always Done) */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <i className="bi bi-flag"></i>
                Status
              </label>
              <div style={styles.statusOptions}>
                <button type="button" style={styles.statusOptionDone} disabled>
                  <i className="bi bi-check-circle"></i>
                  Done
                </button>
              </div>
            </div>

            {/* Google Map Location */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <i className="bi bi-geo-alt"></i>
                Google Map Location
              </label>
              <input
                type="text"
                style={{ ...styles.formInput, ...(submitting && styles.btnDisabled) }}
                placeholder="Paste Google Maps link..."
                value={googleMap}
                onChange={(e) => setGoogleMap(e.target.value)}
                disabled={submitting}
              />
            </div>

            {/* Photos Link */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <i className="bi bi-camera"></i>
                Photos Link
              </label>
              <input
                type="text"
                style={{ ...styles.formInput, ...(submitting && styles.btnDisabled) }}
                placeholder="Paste photos link (Drive/Album)..."
                value={photos}
                onChange={(e) => setPhotos(e.target.value)}
                disabled={submitting}
              />
            </div>

            {/* Transport Used */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <i className="bi bi-truck"></i>
                Transport Used
              </label>
              <input
                type="text"
                style={{ ...styles.formInput, ...(submitting && styles.btnDisabled) }}
                placeholder="e.g., Car, Train, By car with Jitu Balani..."
                value={transport}
                onChange={(e) => setTransport(e.target.value)}
                disabled={submitting}
              />
            </div>

            {/* Distance & Amount - Two Column */}
            <div style={styles.twoColGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <i className="bi bi-signpost-2"></i>
                  Distance (KM)
                </label>
                <input
                  type="text"
                  style={{ ...styles.formInput, ...(submitting && styles.btnDisabled) }}
                  placeholder="e.g., 45"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <i className="bi bi-currency-rupee"></i>
                  Amount
                </label>
                <input
                  type="text"
                  style={{ ...styles.formInput, ...(submitting && styles.btnDisabled) }}
                  placeholder="e.g., 2500/-"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Planned Date Override */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <i className="bi bi-calendar-event"></i>
                Planned Date Override (Optional)
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
          </div>

          {/* Footer */}
          <div style={styles.modalFooter}>
            <button
              style={{ ...styles.btnCancel, ...(submitting && styles.btnDisabled) }}
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              style={{ ...styles.btnPrimary, ...(submitting && styles.btnDisabled) }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span style={styles.spinnerSmall}></span>
                  Saving...
                </>
              ) : (
                <>
                  <i className="bi bi-check-lg"></i>
                  Mark as Done
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function SvStep3({ currentUser, onNextAction }) {
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["sv-step3"],
    queryFn: () => api.get("/site-visit/fms/step3").then((r) => r.data),
    staleTime: 30000,
  });

  const leads = data?.leads || [];

  const filteredLeads = leads.filter((lead) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (lead.enqNo || "").toLowerCase().includes(q) ||
      (lead.clientName || "").toLowerCase().includes(q) ||
      (lead.location || "").toLowerCase().includes(q)
    );
  });

  const handleSuccess = () => {
    queryClient.invalidateQueries(["sv-step3"]);
  };

  return (
    <div className="step-content">
      <div className="filter-bar">
        <div className="search-box">
          <i className="bi bi-search"></i>
          <input
            type="text"
            className="filter-input"
            placeholder="Search..."
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
          <i className="bi bi-exclamation-triangle"></i>
          Failed to load: {error.message}
        </div>
      )}

      {isLoading ? (
        <div className="loading">
          <div className="spinner"></div>
          <span>Loading Step 3 leads...</span>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="empty-state">
          <i className="bi bi-inbox"></i>
          <p>No leads pending in Land Observations</p>
          <small>Leads appear when Step 2 Scheduling is Done</small>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="lead-table">
            <thead>
              <tr>
                {STEP3_COLUMNS.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.enqNo}>
                  {STEP3_COLUMNS.map((col) => (
                    <td key={col.key}>{lead[col.key] || "—"}</td>
                  ))}
                  <td className="actions-cell">
                    {onNextAction && (
                      <button
                        className="btn btn-nap"
                        onClick={() => onNextAction(lead, "Site Visit FMS", "Step 3: Land Observations")}
                        title="NAP"
                      >
                        <i className="bi bi-ticket-perforated"></i>
                        NAP
                      </button>
                    )}
                    <button
                      className="btn btn-action"
                      onClick={() => {
                        setSelectedLead(lead);
                        setShowModal(true);
                      }}
                      title="Update"
                    >
                      <i className="bi bi-pencil-square"></i>
                      Action
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SvStep3Modal
        show={showModal}
        lead={selectedLead}
        onClose={() => {
          setShowModal(false);
          setSelectedLead(null);
        }}
        onSuccess={handleSuccess}
      />
    </div>
  );
}