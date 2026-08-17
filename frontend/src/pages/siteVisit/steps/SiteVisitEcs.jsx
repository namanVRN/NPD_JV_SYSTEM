import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import api from "../../../api.js";

const ECS_COLUMNS = [
  { key: "enqNo", label: "EnQ No" },
  { key: "clientName", label: "Client Name" },
  { key: "leadGeneratedFrom", label: "Lead From" },
  { key: "partnerType", label: "Partner Type" },
  { key: "purpose", label: "Purpose" },
  { key: "location", label: "Location" },
  { key: "contactInfo", label: "Contact Info" },
  { key: "concernPerson", label: "Concern Person" },
  { key: "status", label: "Status" },
];

const STATUS_OPTIONS = [
  {
    value: "Schedule",
    label: "Schedule",
    icon: "bi-calendar-check",
    color: "var(--accent-green)",
  },
  {
    value: "Hold",
    label: "Hold",
    icon: "bi-pause-circle",
    color: "var(--accent-yellow)",
  },
];

function EcsModal({ show, lead, onClose, onSuccess }) {
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!show || !lead) return null;

  const handleSubmit = async () => {
    if (!status) {
      toast.warn("Please select a status");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("/site-visit/ecs/update", {
        rowIndex: lead.rowIndex,
        enqNo: lead.enqNo,
        status,
      });
      if (res.data.success) {
        toast.success(res.data.message);
        onSuccess?.();
        onClose();
      } else throw new Error(res.data.error);
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
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className="bi bi-geo-alt" style={{ marginRight: 8 }}></i>Site
            Visit — Schedule Lead
          </h3>
          <button
            className="close-btn"
            onClick={handleClose}
            disabled={submitting}
          >
            &times;
          </button>
        </div>
        <div className="modal-body">
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
              <span className="info-label">Purpose:</span>
              <span className="info-value">{lead.purpose}</span>
            </div>
          </div>
          <div className="form-group">
            <label>
              <i className="bi bi-flag" style={{ marginRight: 6 }}></i>Status{" "}
              <span className="required">*</span>
            </label>
            <div className="status-options">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`status-option ${status === opt.value ? "selected" : ""}`}
                  onClick={() => setStatus(opt.value)}
                  disabled={submitting}
                  style={{ "--option-color": opt.color }}
                >
                  <i className={`bi ${opt.icon}`}></i>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="btn btn-cancel"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !status}
          >
            {submitting ? (
              <>
                <span className="spinner-small"></span> Updating...
              </>
            ) : (
              <>
                <i className="bi bi-check-lg" style={{ marginRight: 4 }}></i>
                Submit
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SiteVisitEcs({ currentUser, onNextAction }) {
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["sv-ecs"],
    queryFn: () => api.get("/site-visit/ecs").then((r) => r.data),
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

  const handleAction = (lead) => {
    setSelectedLead(lead);
    setShowModal(true);
  };
  const handleSuccess = () => {
    queryClient.invalidateQueries(["sv-ecs"]);
    queryClient.invalidateQueries(["sv-step2"]);
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
          <span>Loading ECS leads...</span>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="empty-state">
          <i className="bi bi-inbox"></i>
          <p>No leads in Site Visit ECS</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="lead-table">
            <thead>
              <tr>
                {ECS_COLUMNS.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.enqNo}>
                  {ECS_COLUMNS.map((col) => (
                    <td key={col.key}>
                      {col.key === "status" && lead.status ? (
                        <span
                          className={`badge ${lead.status === "Schedule" ? "badge-completed" : "badge-open"}`}
                        >
                          {lead.status}
                        </span>
                      ) : (
                        lead[col.key] || "—"
                      )}
                    </td>
                  ))}
                  <td className="actions-cell">
                    {onNextAction && (
                      <button
                        className="btn btn-nap"
                        onClick={() => onNextAction(lead, "Site Visit ECS", "")}
                        title="Next Action Plan"
                      >
                        <i className="bi bi-ticket-perforated"></i>NAP
                      </button>
                    )}
                    <button
                      className="btn btn-action"
                      onClick={() => handleAction(lead)}
                      title="Update Status"
                    >
                      <i className="bi bi-pencil-square"></i>Action
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EcsModal
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
