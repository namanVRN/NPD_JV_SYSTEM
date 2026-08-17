import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import api from "../api.js";

export default function NextActionModal({ show, onClose, lead, sourceTab, stepName, currentUser }) {
  const [users, setUsers] = useState([]);
  const [assignedTo, setAssignedTo] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [desiredDate, setDesiredDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      fetchUsers();
      setAssignedTo("");
      setIssueDescription("");
      setDesiredDate("");
    }
  }, [show]);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/next-action-plan/users");
      setUsers(res.data.users || []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      toast.error("Failed to load users list");
    }
  };

  const handleSubmit = async () => {
    if (!assignedTo || !issueDescription || !desiredDate) {
      toast.warn("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        enqNo: lead?.enqNo || "",
        clientName: lead?.clientName || "",
        location: lead?.location || "",
        raisedBy: currentUser?.userName || "",
        assignedTo,
        issueDescription,
        desiredDate,
        sourceTab: sourceTab || "",
        stepName: stepName || "",
      };

      const res = await api.post("/next-action-plan/create", payload);

      if (res.data.success) {
        toast.success(`Ticket ${res.data.ticketId} created successfully!`);
        onClose();
      } else {
        toast.error(res.data.error || "Failed to create ticket");
      }
    } catch (err) {
      console.error("Error creating ticket:", err);
      toast.error("Failed to create ticket");
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content nap-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className="bi bi-ticket-perforated" style={{ marginRight: 8 }}></i>
            Raise Next Action Plan Ticket
          </h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {/* Pre-filled Lead Info */}
          <div className="nap-lead-info">
            <div className="info-row">
              <span className="info-label">EnQ No</span>
              <span className="info-value">{lead?.enqNo || "—"}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Client</span>
              <span className="info-value">{lead?.clientName || "—"}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Location</span>
              <span className="info-value">{lead?.location || "—"}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Source</span>
              <span className="info-value">
                <span className="badge badge-source">{sourceTab || "—"}</span>
                {stepName && <span className="badge badge-step">{stepName}</span>}
              </span>
            </div>
          </div>

          {/* Form */}
          <div className="nap-form">
            <div className="form-group">
              <label>Assign To <span className="required">*</span></label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="form-select"
              >
                <option value="">-- Select User --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.userName}>
                    {u.userName} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Issue Description <span className="required">*</span></label>
              <textarea
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="Describe the issue or task..."
                rows={3}
                className="form-textarea"
              />
            </div>

            <div className="form-group">
              <label>Desired Completion Date <span className="required">*</span></label>
              <input
                type="date"
                value={desiredDate}
                onChange={(e) => setDesiredDate(e.target.value)}
                className="form-input"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-small"></span> Creating...
              </>
            ) : (
              <>
                <i className="bi bi-send" style={{ marginRight: 4 }}></i> Raise Ticket
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}