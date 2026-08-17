import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import api from "../api.js";

// Helper: Convert sheet date format (DD/MM/YYYY or DD/MM/YYYY HH:MM:SS) to YYYY-MM-DD for input
function sheetDateToInputDate(sheetDate) {
  if (!sheetDate) return "";
  const ddmmMatch = sheetDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (ddmmMatch) {
    const [, dd, mm, yyyy] = ddmmMatch;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  const isoMatch = sheetDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[0];
  return "";
}

function inputDateToSheetDate(inputDate) {
  if (!inputDate) return "";
  const match = inputDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, yyyy, mm, dd] = match;
    return `${dd}/${mm}/${yyyy}`;
  }
  return inputDate;
}

export default function TicketUpdateModal({ show, onClose, ticket, currentUser, onUpdated }) {
  const [status, setStatus] = useState("");
  const [confirmedDate, setConfirmedDate] = useState("");
  const [revisedDate, setRevisedDate] = useState("");
  const [pcRemarks, setPcRemarks] = useState("");
  const [doerRemarks, setDoerRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdmin = currentUser?.role?.toLowerCase() === "admin";
  const isPC = currentUser?.role?.toLowerCase() === "pc";
  const isAdminOrPC = isAdmin || isPC;
  const isAssignedDoer =
    currentUser?.userName?.trim().toLowerCase() === ticket?.assignedTo?.trim().toLowerCase();

  useEffect(() => {
    if (show && ticket) {
      setStatus(ticket.status || "");
      setConfirmedDate(sheetDateToInputDate(ticket.confirmedDate));
      setRevisedDate(sheetDateToInputDate(ticket.revisedDate));
      setPcRemarks(ticket.pcRemarks || "");
      setDoerRemarks(ticket.doerRemarks || "");
    }
  }, [show, ticket]);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const payload = { rowIndex: ticket.rowIndex };

      const confirmedDateSheet = inputDateToSheetDate(confirmedDate);
      const revisedDateSheet = inputDateToSheetDate(revisedDate);
      const originalConfirmedSheet = ticket.confirmedDate || "";
      const originalRevisedSheet = ticket.revisedDate || "";

      if (isAdminOrPC) {
        if (status !== ticket.status) {
          payload.status = status;
        }

        if (confirmedDateSheet !== originalConfirmedSheet) {
          payload.confirmedDate = confirmedDateSheet;
        }

        if (pcRemarks !== ticket.pcRemarks) {
          payload.pcRemarks = pcRemarks;
        }

        if (status === "Date Revision Requested" && revisedDateSheet) {
          payload.status = "Date Revision Requested";
          payload.revisedDate = revisedDateSheet;
        } else if (revisedDateSheet !== originalRevisedSheet) {
          payload.revisedDate = revisedDateSheet;
        }
      }

      if (isAssignedDoer && !isAdminOrPC) {
        if (doerRemarks !== ticket.doerRemarks) {
          payload.doerRemarks = doerRemarks;
        }

        if (status === "Date Revision Requested") {
          if (!revisedDateSheet) {
            toast.warn("Please select a Revised Date for revision request");
            setLoading(false);
            return;
          }
          payload.status = "Date Revision Requested";
          payload.revisedDate = revisedDateSheet;
        } else if (status === "Completed") {
          payload.status = "Completed";
        } else if (status === "Rejected") {
          if (!doerRemarks || doerRemarks.trim() === "" || doerRemarks === ticket.doerRemarks) {
            toast.warn("Please provide a reason for rejection in Doer Remarks");
            setLoading(false);
            return;
          }
          payload.status = "Rejected";
        } else if (status !== ticket.status) {
          payload.status = status;
        }
      }

      if (payload.status === "Date Revision Requested" && !payload.revisedDate) {
        toast.warn("Please select a Revised Date when requesting date revision");
        setLoading(false);
        return;
      }

      const keys = Object.keys(payload).filter((k) => k !== "rowIndex");
      if (keys.length === 0) {
        toast.info("No changes to save");
        setLoading(false);
        return;
      }

      const res = await api.post("/next-action-plan/update", payload);
      if (res.data.success) {
        toast.success("Ticket updated successfully!");
        onUpdated?.();
        onClose();
      } else {
        toast.error(res.data.error || "Update failed");
      }
    } catch (err) {
      console.error("Error updating ticket:", err);
      toast.error("Failed to update ticket: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (!show || !ticket) return null;

  const getStatusOptions = () => {
    if (isAdminOrPC) {
      return ["Open", "PC Confirmed", "In Progress", "Date Revision Requested", "Completed", "Rejected", "Overdue"];
    }
    if (isAssignedDoer) {
      const current = ticket.status;
      if (current === "PC Confirmed" || current === "In Progress") {
        return [current, "In Progress", "Date Revision Requested", "Completed", "Rejected"];
      }
      if (current === "Date Revision Requested") {
        return [current, "In Progress", "Completed", "Rejected"];
      }
      return [current, "Date Revision Requested", "Completed", "Rejected"];
    }
    return [ticket.status];
  };

  const getStatusBadgeClass = (s) => {
    const map = {
      Open: "badge-open",
      "PC Confirmed": "badge-confirmed",
      "In Progress": "badge-progress",
      "Date Revision Requested": "badge-revision",
      Completed: "badge-completed",
      Rejected: "badge-rejected",
      Overdue: "badge-overdue",
    };
    return map[s] || "badge-default";
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ticket-update-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className="bi bi-pencil-square" style={{ marginRight: 8 }}></i>
            Update Ticket: {ticket.ticketId}
          </h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {/* Ticket Summary */}
          <div className="ticket-summary">
            <div className="summary-grid">
              <div className="summary-item">
                <span className="label">EnQ No</span>
                <span className="value">{ticket.enqNo}</span>
              </div>
              <div className="summary-item">
                <span className="label">Client</span>
                <span className="value">{ticket.clientName}</span>
              </div>
              <div className="summary-item">
                <span className="label">Raised By</span>
                <span className="value">{ticket.raisedBy}</span>
              </div>
              {/* ✅ NEW: Raised Date */}
              <div className="summary-item">
                <span className="label">
                  <i className="bi bi-calendar-plus" style={{ marginRight: 4 }}></i>
                  Raised Date
                </span>
                <span className="value" style={{ color: "var(--accent-primary)", fontWeight: 600 }}>
                  {ticket.raisedDate || "—"}
                </span>
              </div>
              <div className="summary-item">
                <span className="label">Assigned To</span>
                <span className="value">{ticket.assignedTo}</span>
              </div>
              <div className="summary-item">
                <span className="label">Desired Date</span>
                <span className="value">{ticket.desiredDate}</span>
              </div>
              <div className="summary-item">
                <span className="label">Current Status</span>
                <span className={`badge ${getStatusBadgeClass(ticket.status)}`}>
                  {ticket.status}
                </span>
              </div>
              {ticket.confirmedDate && (
                <div className="summary-item">
                  <span className="label">Confirmed Date</span>
                  <span className="value">{ticket.confirmedDate}</span>
                </div>
              )}
              {ticket.revisedDate && (
                <div className="summary-item">
                  <span className="label">Revised Date</span>
                  <span className="value" style={{ color: "var(--accent-yellow)" }}>{ticket.revisedDate}</span>
                </div>
              )}
            </div>
            <div className="summary-desc">
              <span className="label">Issue</span>
              <p>{ticket.issueDescription}</p>
            </div>
            {parseInt(ticket.revisionCount) > 0 && (
              <div className="summary-desc" style={{ marginTop: 10 }}>
                <span className="label">
                  Revision History ({ticket.revisionCount} revisions)
                </span>
                <p>{ticket.revisionHistory}</p>
              </div>
            )}
          </div>

          {/* Update Form */}
          <div className="ticket-form">
            <div className="form-group">
              <label>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="form-select"
                disabled={!isAdminOrPC && !isAssignedDoer}
              >
                {getStatusOptions().map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {isAdminOrPC && (
              <div className="form-group">
                <label>Confirmed Date (PC fills after calling doer)</label>
                <input
                  type="date"
                  value={confirmedDate}
                  onChange={(e) => setConfirmedDate(e.target.value)}
                  className="form-input"
                />
              </div>
            )}

            {(isAdminOrPC || status === "Date Revision Requested") && (
              <div className="form-group">
                <label>
                  Revised Date
                  {status === "Date Revision Requested" && (
                    <span style={{ color: "var(--accent-red)", marginLeft: 4 }}>*</span>
                  )}
                </label>
                <input
                  type="date"
                  value={revisedDate}
                  onChange={(e) => setRevisedDate(e.target.value)}
                  className="form-input"
                  style={
                    status === "Date Revision Requested" && !revisedDate
                      ? { borderColor: "var(--accent-red)" }
                      : {}
                  }
                />
                {status === "Date Revision Requested" && (
                  <small style={{ display: "block", marginTop: 4, color: "var(--text-secondary)", fontSize: 12 }}>
                    Required: Select new date for the revision
                  </small>
                )}
              </div>
            )}

            {isAdminOrPC && (
              <div className="form-group">
                <label>PC Remarks</label>
                <textarea
                  value={pcRemarks}
                  onChange={(e) => setPcRemarks(e.target.value)}
                  placeholder="PC / Admin notes..."
                  rows={2}
                  className="form-textarea"
                />
              </div>
            )}

            {isAssignedDoer && (
              <div className="form-group">
                <label>
                  Doer Remarks
                  {status === "Rejected" && (
                    <span style={{ color: "var(--accent-red)", marginLeft: 4 }}>* (reason required for rejection)</span>
                  )}
                </label>
                <textarea
                  value={doerRemarks}
                  onChange={(e) => setDoerRemarks(e.target.value)}
                  placeholder={status === "Rejected" ? "Why are you rejecting this task?..." : "Your notes / update..."}
                  rows={2}
                  className="form-textarea"
                  style={status === "Rejected" ? { borderColor: "var(--accent-red)" } : {}}
                />
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleUpdate} disabled={loading}>
            {loading ? (
              <><span className="spinner-small"></span> Updating...</>
            ) : (
              <><i className="bi bi-check-lg" style={{ marginRight: 4 }}></i> Update Ticket</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}