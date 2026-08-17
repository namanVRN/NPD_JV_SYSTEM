import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api.js";
import AssignLeadModal from "../components/AssignLeadModal.jsx";

export default function LeadAssignmentPage({ currentUser }) {
  const [search, setSearch] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [viewMode, setViewMode] = useState("current"); // "current" or "history"
  const [selectedLead, setSelectedLead] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const isAdmin = currentUser?.role?.toLowerCase() === "admin";

  // Fetch all assignments
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["assignment-all"],
    queryFn: async () => {
      const res = await api.get("/lead-assignment/all");
      return res.data;
    },
    staleTime: 30000,
  });

  // Fetch users for filter
  const { data: usersData } = useQuery({
    queryKey: ["assignment-users"],
    queryFn: async () => {
      const res = await api.get("/lead-assignment/users");
      return res.data.users || [];
    },
    staleTime: 60000,
  });

  const allAssignments = data?.assignments || [];
  const latestByEnq = data?.latestByEnq || {};
  const users = usersData || [];

  // Current view: unique latest per EnQ No
  const currentAssignments = Object.values(latestByEnq);

  // Get list based on view mode
  const rawList = viewMode === "current" ? currentAssignments : allAssignments;

  // Sort: newest first
  const sortedList = [...rawList].sort((a, b) => {
    // Compare by timestamp DD/MM/YYYY, HH:MM:SS
    return b.timestamp.localeCompare(a.timestamp);
  });

  // Apply filters
  const filteredList = sortedList.filter((item) => {
    const matchesSearch =
      !search ||
      item.enqNo?.toLowerCase().includes(search.toLowerCase()) ||
      item.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      item.to?.toLowerCase().includes(search.toLowerCase()) ||
      item.from?.toLowerCase().includes(search.toLowerCase()) ||
      item.assignedBy?.toLowerCase().includes(search.toLowerCase());

    const matchesAssignee = !filterAssignee || item.to === filterAssignee;

    return matchesSearch && matchesAssignee;
  });

  const handleRowClick = (item) => {
    setSelectedLead({
      enqNo: item.enqNo,
      clientName: item.clientName,
    });
    setShowModal(true);
  };

  // Stats
  const stats = {
    totalLeads: currentAssignments.length,
    totalLogs: allAssignments.length,
    assignedUsers: new Set(currentAssignments.map((a) => a.to).filter(Boolean)).size,
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">
          <i className="bi bi-person-badge" style={{ marginRight: 10, color: "#6366f1" }}></i>
          Lead Assignment
        </h2>
        <span className="badge badge-blue">{filteredList.length} entries</span>
      </div>

      {/* Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12,
        marginBottom: 16,
      }}>
        <div style={{
          padding: 16,
          background: "var(--bg-primary, #ffffff)",
          border: "1px solid var(--border-primary, #e5e7eb)",
          borderRadius: 10,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#6366f1" }}>{stats.totalLeads}</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Assigned Leads</div>
        </div>
        <div style={{
          padding: 16,
          background: "var(--bg-primary, #ffffff)",
          border: "1px solid var(--border-primary, #e5e7eb)",
          borderRadius: 10,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#22c55e" }}>{stats.assignedUsers}</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Active Doers</div>
        </div>
        <div style={{
          padding: 16,
          background: "var(--bg-primary, #ffffff)",
          border: "1px solid var(--border-primary, #e5e7eb)",
          borderRadius: 10,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#eab308" }}>{stats.totalLogs}</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Total Log Entries</div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          className={`filter-select ${viewMode === "current" ? "" : ""}`}
          onClick={() => setViewMode("current")}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: viewMode === "current" ? "2px solid #6366f1" : "1px solid var(--border-primary, #d1d5db)",
            background: viewMode === "current" ? "rgba(99, 102, 241, 0.1)" : "var(--bg-primary, #ffffff)",
            color: viewMode === "current" ? "#6366f1" : "var(--text-primary, #374151)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <i className="bi bi-person-check"></i>
          Current Assignments ({currentAssignments.length})
        </button>
        <button
          onClick={() => setViewMode("history")}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: viewMode === "history" ? "2px solid #6366f1" : "1px solid var(--border-primary, #d1d5db)",
            background: viewMode === "history" ? "rgba(99, 102, 241, 0.1)" : "var(--bg-primary, #ffffff)",
            color: viewMode === "history" ? "#6366f1" : "var(--text-primary, #374151)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <i className="bi bi-clock-history"></i>
          Full History ({allAssignments.length})
        </button>
      </div>

      {/* Filters */}
      <div className="nap-filters" style={{ marginBottom: 12 }}>
        <div className="search-box">
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder="Search by EnQ No, client, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="filter-select"
        >
          <option value="">All Assignees</option>
          {users.map((u) => (
            <option key={u.id} value={u.userName}>{u.userName}</option>
          ))}
        </select>

        <button className="btn-refresh" onClick={() => refetch()}>
          <i className="bi bi-arrow-clockwise"></i> Refresh
        </button>
      </div>

      {/* Info banner */}
      {!isAdmin && (
        <div style={{
          padding: "10px 14px",
          background: "rgba(59, 130, 246, 0.08)",
          border: "1px solid rgba(59, 130, 246, 0.2)",
          borderRadius: 8,
          color: "#3b82f6",
          fontSize: 13,
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <i className="bi bi-info-circle-fill"></i>
          You're viewing in read-only mode. Only Admin can assign or change leads.
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="loading">
          <div className="spinner"></div>
          <span>Loading assignments...</span>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="empty-state">
          <i className="bi bi-person-badge"></i>
          <p>No assignments found</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <div className="table-scroll">
            <table className="lead-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>EnQ No</th>
                  <th>Client Name</th>
                  <th>From</th>
                  <th></th>
                  <th>To (Current)</th>
                  <th>Assigned By</th>
                  <th>Step</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item, idx) => (
                  <tr key={`${item.enqNo}-${item.timestamp}-${idx}`}>
                    <td style={{ fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" }}>
                      {item.timestamp || "—"}
                    </td>
                    <td className="td-enq">{item.enqNo}</td>
                    <td className="td-client">{item.clientName || "—"}</td>
                    <td style={{ color: "#9ca3af", fontSize: 13 }}>
                      {item.from || "Unassigned"}
                    </td>
                    <td style={{ textAlign: "center", color: "#6366f1" }}>
                      <i className="bi bi-arrow-right"></i>
                    </td>
                    <td>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 10px",
                        background: "rgba(99, 102, 241, 0.1)",
                        borderRadius: 6,
                        color: "#6366f1",
                        fontWeight: 600,
                        fontSize: 13,
                      }}>
                        <i className="bi bi-person-check"></i>
                        {item.to || "—"}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      <span style={{
                        padding: "3px 8px",
                        background: "rgba(234, 179, 8, 0.1)",
                        borderRadius: 4,
                        color: "#b45309",
                        fontSize: 12,
                        fontWeight: 500,
                      }}>
                        {item.assignedBy || "—"}
                      </span>
                    </td>
                    <td>
                      {item.stepName ? (
                        <span className="badge badge-source" style={{ fontSize: 11 }}>{item.stepName}</span>
                      ) : "—"}
                    </td>
                    <td>
                      <button
                        className="btn btn-action"
                        onClick={() => handleRowClick(item)}
                        title={isAdmin ? "Reassign / View History" : "View History"}
                      >
                        <i className={isAdmin ? "bi bi-pencil-square" : "bi bi-eye"}></i>
                        {isAdmin ? "Reassign" : "View"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      <AssignLeadModal
        show={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedLead(null);
        }}
        lead={selectedLead}
        stepName=""
        currentUser={currentUser}
        currentAssignee={selectedLead ? latestByEnq[selectedLead.enqNo]?.to : ""}
      />
    </div>
  );
}