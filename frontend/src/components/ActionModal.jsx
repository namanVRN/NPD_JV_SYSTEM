import React, { useState, useRef } from "react";
import RemarksSection from "./Remarkssection.jsx";

export default function ActionModal({ lead, statusOptions, onSubmit, onClose, loading }) {
  const [status, setStatus] = useState("");
  const [remarks, setRemarks] = useState(lead?.remarks || "");
  const remarksRef = useRef(null);

  const handleSubmit = async () => {
    if (!status) return;

    // Save remark to Remarks sheet if entered
    const remarkText = remarksRef.current?.getRemarkText() || "";
    if (remarkText.trim()) {
      await remarksRef.current.saveRemark(remarkText);
    }

    onSubmit({ enqNo: lead.enqNo, status, remarks });
  };

  if (!lead) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className="bi bi-pencil-square" style={{ marginRight: 8, color: "var(--accent-primary)" }}></i>
            Update Lead
          </h3>
          <button className="modal-close" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="modal-body">
          {/* Lead Info */}
          <div className="lead-info">
            <div className="lead-info-row">
              <span className="label">EnQ No</span>
              <span className="value" style={{ color: "var(--accent-primary)" }}>{lead.enqNo}</span>
            </div>
            <div className="lead-info-row">
              <span className="label">Client</span>
              <span className="value">{lead.clientName}</span>
            </div>
            <div className="lead-info-row">
              <span className="label">Location</span>
              <span className="value">{lead.location}</span>
            </div>
            <div className="lead-info-row">
              <span className="label">Contact</span>
              <span className="value">{lead.contactInfo || "—"}</span>
            </div>
            <div className="lead-info-row">
              <span className="label">Concern Person</span>
              <span className="value">{lead.concernPerson}</span>
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="form-group">
            <label>Status</label>
            <select
              className="form-control"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">-- Select Status --</option>
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Old Remarks Field (for status update) */}
          <div className="form-group">
            <label>Remarks (with status)</label>
            <textarea
              className="form-control"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add remarks for status update..."
              rows={2}
            />
          </div>

          {/* ✅ RemarksSection — Independent save, old remarks history */}
          <RemarksSection
            ref={remarksRef}
            enqNo={lead.enqNo}
            stepName={
              statusOptions.some((o) => o.value === "DONE")
                ? "Pipeline"
                : statusOptions.some((o) => o.value === "COLD LEADS")
                  ? "Not Qualified"
                  : "Cold Leads"
            }
            disabled={loading}
          />
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!status || loading}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></span>
                Saving...
              </>
            ) : (
              <>
                <i className="bi bi-check-lg"></i>
                Submit
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}