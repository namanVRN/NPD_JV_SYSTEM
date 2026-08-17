import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api.js";
import TicketUpdateModal from "../components/TicketUpdateModal.jsx";

// ✅ Properly parse DD/MM/YYYY or DD/MM/YYYY, HH:MM:SS to JS Date
function parseSheetDate(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (!str) return null;

  const match = str.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[, ]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/,
  );
  if (match) {
    const [, dd, mm, yyyy, hh, mi, ss] = match;
    const d = new Date(
      parseInt(yyyy),
      parseInt(mm) - 1,
      parseInt(dd),
      hh ? parseInt(hh) : 23,
      mi ? parseInt(mi) : 59,
      ss ? parseInt(ss) : 59,
      999,
    );
    return isNaN(d.getTime()) ? null : d;
  }

  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      return d;
    }
  }

  return null;
}

function parseDateForRange(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (!str) return null;

  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    const d = new Date(
      parseInt(yyyy),
      parseInt(mm) - 1,
      parseInt(dd),
      0,
      0,
      0,
      0,
    );
    return isNaN(d.getTime()) ? null : d;
  }

  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }

  return null;
}

export default function NextActionPlanPage({ currentUser }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [confirmDateFrom, setConfirmDateFrom] = useState("");
  const [confirmDateTo, setConfirmDateTo] = useState("");
  const [showCompleted, setShowCompleted] = useState(false); // ✅ NEW: Toggle for completed
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const isAdmin = currentUser?.role?.toLowerCase() === "admin";

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["next-action-plan-tickets"],
    queryFn: async () => {
      const res = await api.get("/next-action-plan/list");
      return res.data.tickets || [];
    },
    staleTime: 30000,
  });

  const { data: usersData } = useQuery({
    queryKey: ["nap-users"],
    queryFn: async () => {
      const res = await api.get("/next-action-plan/users");
      return res.data.users || [];
    },
    staleTime: 60000,
  });

  const tickets = data || [];
  const users = usersData || [];

  const dateFromObj = confirmDateFrom
    ? new Date(confirmDateFrom + "T00:00:00")
    : null;
  const dateToObj = confirmDateTo
    ? new Date(confirmDateTo + "T23:59:59")
    : null;

  // ✅ FIRST: Hide completed unless toggle is on
  const visibleTickets = tickets.filter((t) => {
    if (!showCompleted && t.status?.toLowerCase() === "completed") return false;
    return true;
  });

  // Then apply other filters
  const filteredTickets = visibleTickets.filter((t) => {
    const matchesSearch =
      !search ||
      t.ticketId?.toLowerCase().includes(search.toLowerCase()) ||
      t.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      t.enqNo?.toLowerCase().includes(search.toLowerCase()) ||
      t.issueDescription?.toLowerCase().includes(search.toLowerCase()) ||
      t.assignedTo?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = !filterStatus || t.status === filterStatus;
    const matchesAssignee = !filterAssignee || t.assignedTo === filterAssignee;

    let matchesConfirmDate = true;
    if (dateFromObj || dateToObj) {
      const confirmedDateObj = parseDateForRange(t.confirmedDate);
      if (!confirmedDateObj) {
        matchesConfirmDate = false;
      } else {
        if (dateFromObj && confirmedDateObj < dateFromObj)
          matchesConfirmDate = false;
        if (dateToObj && confirmedDateObj > dateToObj)
          matchesConfirmDate = false;
      }
    }

    return (
      matchesSearch && matchesStatus && matchesAssignee && matchesConfirmDate
    );
  });

  const isOverdue = (ticket) => {
    const statusLower = ticket.status?.toLowerCase();
    if (statusLower === "completed" || statusLower === "rejected") return false;

    const checkDate =
      ticket.revisedDate || ticket.confirmedDate || ticket.desiredDate;
    if (!checkDate) return false;

    const dueDate = parseSheetDate(checkDate);
    if (!dueDate) return false;

    return new Date() > dueDate;
  };

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "Open").length,
    confirmed: tickets.filter((t) => t.status === "PC Confirmed").length,
    inProgress: tickets.filter((t) => t.status === "In Progress").length,
    revision: tickets.filter((t) => t.status === "Date Revision Requested")
      .length,
    completed: tickets.filter((t) => t.status === "Completed").length,
    rejected: tickets.filter((t) => t.status === "Rejected").length,
    overdue: tickets.filter(isOverdue).length,
  };

  const getStatusBadgeClass = (status) => {
    const map = {
      Open: "badge-open",
      "PC Confirmed": "badge-confirmed",
      "In Progress": "badge-progress",
      "Date Revision Requested": "badge-revision",
      Completed: "badge-completed",
      Rejected: "badge-rejected",
      Overdue: "badge-overdue",
    };
    return map[status] || "badge-default";
  };

  const getStatusIcon = (status) => {
    const map = {
      Open: "bi-circle",
      "PC Confirmed": "bi-check-circle",
      "In Progress": "bi-arrow-repeat",
      "Date Revision Requested": "bi-calendar-event",
      Completed: "bi-check-circle-fill",
      Rejected: "bi-x-circle-fill",
      Overdue: "bi-exclamation-triangle-fill",
    };
    return map[status] || "bi-circle";
  };

  const handleTicketClick = (ticket) => {
    setSelectedTicket(ticket);
    setShowUpdateModal(true);
  };

  const handleClearFilters = () => {
    setSearch("");
    setFilterStatus("");
    setFilterAssignee("");
    setConfirmDateFrom("");
    setConfirmDateTo("");
  };

  const hasActiveFilters =
    search ||
    filterStatus ||
    filterAssignee ||
    confirmDateFrom ||
    confirmDateTo;

  const setQuickRange = (preset) => {
    const today = new Date();
    const fmt = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    if (preset === "today") {
      const t = fmt(today);
      setConfirmDateFrom(t);
      setConfirmDateTo(t);
    } else if (preset === "week") {
      const start = new Date(today);
      start.setDate(today.getDate() - 7);
      setConfirmDateFrom(fmt(start));
      setConfirmDateTo(fmt(today));
    } else if (preset === "month") {
      const start = new Date(today);
      start.setDate(today.getDate() - 30);
      setConfirmDateFrom(fmt(start));
      setConfirmDateTo(fmt(today));
    } else if (preset === "thisMonth") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setConfirmDateFrom(fmt(start));
      setConfirmDateTo(fmt(end));
    }
  };

  // ✅ Sort cards: Overdue first → Revision Req → In Progress → PC Confirmed → Open → Rejected → Completed
  const statusPriority = {
    "Date Revision Requested": 2,
    "In Progress": 3,
    "PC Confirmed": 4,
    Open: 5,
    Rejected: 6,
    Completed: 7,
  };

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    const aOv = isOverdue(a);
    const bOv = isOverdue(b);
    if (aOv && !bOv) return -1;
    if (!aOv && bOv) return 1;
    const aP = statusPriority[a.status] || 99;
    const bP = statusPriority[b.status] || 99;
    return aP - bP;
  });

  return (
    <div className="nap-page">
      {/* Page Header */}
      <div className="page-header">
        <h2 className="page-title">
          <i
            className="bi bi-ticket-perforated"
            style={{ marginRight: 10, color: "var(--accent-primary)" }}
          ></i>
          Next Action Plan
        </h2>
        <span className="badge badge-blue">{sortedTickets.length} tickets</span>
      </div>

      {/* Stats */}
      <div className="nap-stats">
        <div className="stat-card">
          <span className="stat-number">{stats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-card stat-open">
          <span className="stat-number">{stats.open}</span>
          <span className="stat-label">Open</span>
        </div>
        <div className="stat-card stat-confirmed">
          <span className="stat-number">{stats.confirmed}</span>
          <span className="stat-label">PC Confirmed</span>
        </div>
        <div className="stat-card stat-progress">
          <span className="stat-number">{stats.inProgress}</span>
          <span className="stat-label">In Progress</span>
        </div>
        <div className="stat-card stat-revision">
          <span className="stat-number">{stats.revision}</span>
          <span className="stat-label">Revision Req</span>
        </div>
        <div className="stat-card stat-completed">
          <span className="stat-number">{stats.completed}</span>
          <span className="stat-label">Completed</span>
        </div>
        {stats.overdue > 0 && (
          <div className="stat-card stat-overdue">
            <span className="stat-number">{stats.overdue}</span>
            <span className="stat-label">Overdue</span>
          </div>
        )}
        {stats.rejected > 0 && (
          <div className="stat-card stat-rejected">
            <span className="stat-number">{stats.rejected}</span>
            <span className="stat-label">Rejected</span>
          </div>
        )}
      </div>

      {/* Filters Row 1 */}
      <div className="nap-filters">
        <div className="search-box">
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="filter-select"
        >
          <option value="">All Statuses</option>
          <option value="Open">Open</option>
          <option value="PC Confirmed">PC Confirmed</option>
          <option value="In Progress">In Progress</option>
          <option value="Date Revision Requested">
            Date Revision Requested
          </option>
          {showCompleted && <option value="Completed">Completed</option>}
          <option value="Rejected">Rejected</option>
          <option value="Overdue">Overdue</option>
        </select>

        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="filter-select"
        >
          <option value="">All Assignees</option>
          {users.map((u) => (
            <option key={u.id} value={u.userName}>
              {u.userName}
            </option>
          ))}
        </select>

        {/* ✅ Show Completed Toggle */}
        <label className="completed-toggle">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => {
              setShowCompleted(e.target.checked);
              if (!e.target.checked && filterStatus === "Completed") {
                setFilterStatus("");
              }
            }}
          />
          <span>
            <i
              className="bi bi-check-circle-fill"
              style={{ marginRight: 4 }}
            ></i>
            Show Completed ({stats.completed})
          </span>
        </label>

        <button className="btn-refresh" onClick={() => refetch()}>
          <i className="bi bi-arrow-clockwise"></i> Refresh
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="nap-date-filter">
        <div className="date-filter-group">
          <label className="date-filter-label">
            <i className="bi bi-calendar-check" style={{ marginRight: 6 }}></i>
            Confirmed Date Range:
          </label>

          <div className="date-inputs-wrapper">
            <div className="date-input-item">
              <span className="date-input-label">From</span>
              <input
                type="date"
                value={confirmDateFrom}
                onChange={(e) => setConfirmDateFrom(e.target.value)}
                className="filter-date-input"
                max={confirmDateTo || undefined}
              />
            </div>

            <div className="date-input-item">
              <span className="date-input-label">To</span>
              <input
                type="date"
                value={confirmDateTo}
                onChange={(e) => setConfirmDateTo(e.target.value)}
                className="filter-date-input"
                min={confirmDateFrom || undefined}
              />
            </div>
          </div>
        </div>

        <div className="date-presets">
          <button className="preset-btn" onClick={() => setQuickRange("today")}>
            Today
          </button>
          <button className="preset-btn" onClick={() => setQuickRange("week")}>
            Last 7 Days
          </button>
          <button className="preset-btn" onClick={() => setQuickRange("month")}>
            Last 30 Days
          </button>
          <button
            className="preset-btn"
            onClick={() => setQuickRange("thisMonth")}
          >
            This Month
          </button>
        </div>

        {hasActiveFilters && (
          <button className="btn-clear-filters" onClick={handleClearFilters}>
            <i className="bi bi-x-circle"></i> Clear All
          </button>
        )}
      </div>

      {(confirmDateFrom || confirmDateTo) && (
        <div className="active-filter-info">
          <i className="bi bi-funnel-fill"></i>
          Showing tickets with Confirmed Date
          {confirmDateFrom && (
            <>
              {" "}
              from <strong>{confirmDateFrom}</strong>
            </>
          )}
          {confirmDateTo && (
            <>
              {" "}
              to <strong>{confirmDateTo}</strong>
            </>
          )}
        </div>
      )}

      {/* ✅ CARD LAYOUT */}
      {isLoading ? (
        <div className="loading">
          <div className="spinner"></div>
          <span>Loading tickets...</span>
        </div>
      ) : sortedTickets.length === 0 ? (
        <div className="empty-state">
          <i className="bi bi-ticket-perforated"></i>
          <p>No tickets found</p>
          {hasActiveFilters && (
            <button
              className="btn btn-ghost"
              onClick={handleClearFilters}
              style={{ marginTop: 10 }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="ticket-cards-grid">
          {sortedTickets.map((ticket) => {
            const ov = isOverdue(ticket);
            const displayStatus = ov ? "Overdue" : ticket.status;
            const isCompleted = ticket.status?.toLowerCase() === "completed";
            const isRejected = ticket.status?.toLowerCase() === "rejected";

            return (
              <div
                key={ticket.ticketId}
                className={`ticket-card ${ov ? "card-overdue" : ""} ${isCompleted ? "card-completed" : ""} ${isRejected ? "card-rejected" : ""}`}
                onClick={() => handleTicketClick(ticket)}
              >
                {/* Card Header */}
                <div className="ticket-card-header">
                  <div className="ticket-card-id">
                    <i className="bi bi-ticket-perforated-fill"></i>
                    <span>{ticket.ticketId}</span>
                  </div>
                  <span
                    className={`badge ${getStatusBadgeClass(displayStatus)}`}
                  >
                    <i
                      className={getStatusIcon(displayStatus)}
                      style={{ marginRight: 4 }}
                    ></i>
                    {displayStatus}
                  </span>
                </div>

                {/* Client & EnQ */}
                <div className="ticket-card-client">
                  <h4 className="client-name">{ticket.clientName || "—"}</h4>
                  <span className="enq-badge">{ticket.enqNo}</span>
                </div>

                {/* Issue Description */}
                <div className="ticket-card-issue">
                  <i className="bi bi-chat-left-text"></i>
                  <p title={ticket.issueDescription}>
                    {ticket.issueDescription?.length > 100
                      ? ticket.issueDescription.substring(0, 100) + "..."
                      : ticket.issueDescription || "No description"}
                  </p>
                </div>

                {/* Meta Grid — ✅ Added Raised Date as first item */}
                <div className="ticket-card-meta">
                  <div className="meta-item meta-highlight">
                    <span className="meta-label">
                      <i className="bi bi-calendar-plus"></i> Raised
                    </span>
                    <span className="meta-value">
                      {ticket.raisedDate || "—"}
                    </span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">
                      <i className="bi bi-person"></i> Raised By
                    </span>
                    <span className="meta-value">{ticket.raisedBy || "—"}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">
                      <i className="bi bi-person-check"></i> Assigned
                    </span>
                    <span className="meta-value">
                      {ticket.assignedTo || "—"}
                    </span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">
                      <i className="bi bi-calendar3"></i> Desired
                    </span>
                    <span className="meta-value">
                      {ticket.desiredDate || "—"}
                    </span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">
                      <i className="bi bi-calendar-check"></i> Confirmed
                    </span>
                    <span className="meta-value">
                      {ticket.confirmedDate || "—"}
                    </span>
                  </div>
                  {ticket.revisedDate && (
                    <div className="meta-item">
                      <span className="meta-label">
                        <i className="bi bi-calendar-event"></i> Revised
                      </span>
                      <span
                        className="meta-value"
                        style={{ color: "var(--accent-yellow, #eab308)" }}
                      >
                        {ticket.revisedDate}
                      </span>
                    </div>
                  )}
                </div>

                {/* Revision Info (if any) */}
                {parseInt(ticket.revisionCount) > 0 && (
                  <div className="ticket-card-revision">
                    <i className="bi bi-arrow-repeat"></i>
                    <span>
                      {ticket.revisionCount} revision(s)
                      {ticket.revisedDate && <> — Last: {ticket.revisedDate}</>}
                    </span>
                  </div>
                )}

                {/* Footer Tags */}
                <div className="ticket-card-footer">
                  <div className="ticket-card-tags">
                    <span className="badge badge-source">
                      {ticket.sourceTab}
                    </span>
                    {ticket.stepName && (
                      <span className="badge badge-step">
                        {ticket.stepName}
                      </span>
                    )}
                  </div>
                  <div className="ticket-card-action">
                    <i className="bi bi-pencil-square"></i>
                    <span>Click to Update</span>
                  </div>
                </div>

                {/* Overdue Banner */}
                {ov && (
                  <div className="overdue-banner">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    Overdue!
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Update Modal */}
      <TicketUpdateModal
        show={showUpdateModal}
        onClose={() => {
          setShowUpdateModal(false);
          setSelectedTicket(null);
        }}
        ticket={selectedTicket}
        currentUser={currentUser}
        onUpdated={refetch}
      />
    </div>
  );
}
