import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import api from "../api.js";

export default function AssignLeadModal({
  show,
  onClose,
  lead,
  stepName,
  currentUser,
  currentAssignee,
}) {
  const [selectedUser, setSelectedUser] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const isAdmin = currentUser?.role?.toLowerCase() === "admin";

  // Fetch users
  const { data: usersData } = useQuery({
    queryKey: ["assignment-users"],
    queryFn: async () => {
      const res = await api.get("/lead-assignment/users");
      return res.data.users || [];
    },
    staleTime: 60000,
  });

  // Fetch history for this lead
  const { data: historyData } = useQuery({
    queryKey: ["assignment-history", lead?.enqNo],
    queryFn: async () => {
      const res = await api.get(`/lead-assignment/history?enqNo=${encodeURIComponent(lead.enqNo)}`);
      return res.data.history || [];
    },
    enabled: !!lead?.enqNo && show,
    staleTime: 30000,
  });

  const users = usersData || [];
  const history = historyData || [];

  useEffect(() => {
    if (show) {
      setSelectedUser(currentAssignee || "");
    }
  }, [show, currentAssignee]);

  const handleAssign = async () => {
    if (!selectedUser) {
      toast.warn("Please select a user");
      return;
    }

    if (!isAdmin) {
      toast.error("Only Admin can assign leads");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/lead-assignment/assign", {
        enqNo: lead.enqNo,
        clientName: lead.clientName,
        assignedTo: selectedUser,
        assignedBy: currentUser.userName,
        stepName: stepName || "",
        currentUserRole: currentUser.role,
      });

      if (res.data.success) {
        if (res.data.noChange) {
          toast.info(res.data.message);
        } else {
          toast.success(res.data.message);
        }
        queryClient.invalidateQueries(["assignment-latest"]);
        queryClient.invalidateQueries(["assignment-all"]);
        queryClient.invalidateQueries(["assignment-history", lead.enqNo]);
        onClose();
      } else {
        toast.error(res.data.error || "Assignment failed");
      }
    } catch (err) {
      console.error("Assignment error:", err);
      toast.error("Failed: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (!show || !lead) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "560px" }}
      >
        <div className="modal-header">
          <h3>
            <i className="bi bi-person-plus-fill" style={{ marginRight: 8, color: "#6366f1" }}></i>
            Assign Lead
          </h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {/* Lead Info */}
          <div className="lead-info-card" style={{ marginBottom: 20 }}>
            <div className="info-row">
              <span className="info-label">EnQ No:</span>
              <span className="info-value" style={{ color: "#6366f1", fontWeight: 600 }}>{lead.enqNo}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Client:</span>
              <span className="info-value">{lead.clientName}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Currently Assigned:</span>
              <span className="info-value">
                {currentAssignee ? (
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 10px",
                    background: "rgba(99, 102, 241, 0.1)",
                    borderRadius: 6,
                    color: "#6366f1",
                    fontWeight: 600,
                    fontSize: 13
                  }}>
                    <i className="bi bi-person-check"></i>
                    {currentAssignee}
                  </span>
                ) : (
                  <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Unassigned</span>
                )}
              </span>
            </div>
            {stepName && (
              <div className="info-row">
                <span className="info-label">Current Step:</span>
                <span className="info-value">
                  <span className="badge badge-source">{stepName}</span>
                </span>
              </div>
            )}
          </div>

          {/* Admin Only Assignment */}
          {isAdmin ? (
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label style={{ fontWeight: 600, marginBottom: 8, display: "block" }}>
                <i className="bi bi-person-check" style={{ marginRight: 6 }}></i>
                Assign To <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="form-select"
                style={{ width: "100%", padding: "10px 12px", fontSize: 14, borderRadius: 8 }}
                disabled={loading}
              >
                <option value="">-- Select User --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.userName}>
                    {u.userName} {u.role ? `(${u.role})` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{
              padding: 12,
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: 8,
              color: "#ef4444",
              fontSize: 13,
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <i className="bi bi-lock-fill"></i>
              Only Admin can assign or change lead assignments
            </div>
          )}

          {/* Assignment History */}
          <div style={{ borderTop: "1px solid var(--border-primary, #e5e7eb)", paddingTop: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <i className="bi bi-clock-history" style={{ color: "#6366f1" }}></i>
              Assignment History ({history.length})
            </h4>

            {history.length === 0 ? (
              <p style={{ fontSize: 13, color: "#9ca3af", fontStyle: "italic", textAlign: "center", padding: 12 }}>
                No assignment history yet
              </p>
            ) : (
              <div style={{ maxHeight: 250, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                {history.map((h, idx) => (
                  <div key={idx} style={{
                    padding: 10,
                    background: "var(--bg-tertiary, #f9fafb)",
                    border: "1px solid var(--border-secondary, #e5e7eb)",
                    borderRadius: 8,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        <span style={{ color: "#9ca3af" }}>{h.from || "Unassigned"}</span>
                        <i className="bi bi-arrow-right" style={{ margin: "0 6px", color: "#6366f1" }}></i>
                        <span style={{ color: "#6366f1", fontWeight: 600 }}>{h.to}</span>
                      </div>
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>{h.timestamp}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280", display: "flex", gap: 12 }}>
                      <span>
                        <i className="bi bi-person-fill-gear" style={{ marginRight: 3 }}></i>
                        By: <strong>{h.assignedBy}</strong>
                      </span>
                      {h.stepName && (
                        <span>
                          <i className="bi bi-tag" style={{ marginRight: 3 }}></i>
                          {h.stepName}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-cancel" onClick={onClose} disabled={loading}>
            {isAdmin ? "Cancel" : "Close"}
          </button>
          {isAdmin && (
            <button
              className="btn btn-primary"
              onClick={handleAssign}
              disabled={loading || !selectedUser}
            >
              {loading ? (
                <><span className="spinner-small"></span> Assigning...</>
              ) : (
                <><i className="bi bi-check-lg" style={{ marginRight: 4 }}></i> Assign Lead</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}