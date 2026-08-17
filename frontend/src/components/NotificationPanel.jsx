import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api.js";

export default function NotificationPanel({ currentUser, onTicketClick }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("assigned");

  // ✅ NEW: Date range filter states
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch ALL tickets
  const { data, isLoading } = useQuery({
    queryKey: ["all-tickets-panel", currentUser?.userName],
    queryFn: async () => {
      const res = await api.get("/next-action-plan/list");
      return res.data.tickets || [];
    },
    enabled: !!currentUser?.userName,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const allTickets = data || [];

  // ✅ Parse DD/MM/YYYY format (for both dueDate & raisedDate)
  function parseDDMMYYYY(dateStr, endOfDay = true) {
    if (!dateStr) return null;
    const str = String(dateStr).trim();

    const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      const [, dd, mm, yyyy] = match;
      const d = new Date(
        parseInt(yyyy),
        parseInt(mm) - 1,
        parseInt(dd),
        endOfDay ? 23 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 999 : 0,
      );
      return isNaN(d.getTime()) ? null : d;
    }

    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  // ✅ Filter by raisedDate range
  const filterByDateRange = (tickets) => {
    if (!dateFrom && !dateTo) return tickets;

    const fromDate = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
    const toDate = dateTo ? new Date(dateTo + "T23:59:59") : null;

    return tickets.filter((t) => {
      const raisedDateObj = parseDDMMYYYY(t.raisedDate, false);
      if (!raisedDateObj) return false;

      if (fromDate && raisedDateObj < fromDate) return false;
      if (toDate && raisedDateObj > toDate) return false;

      return true;
    });
  };

  // Assigned to me
  const assignedToMeAll = allTickets.filter(
    (t) =>
      t.assignedTo?.trim().toLowerCase() ===
      currentUser?.userName?.trim().toLowerCase(),
  );

  // Raised by me
  const raisedByMeAll = allTickets.filter(
    (t) =>
      t.raisedBy?.trim().toLowerCase() ===
      currentUser?.userName?.trim().toLowerCase(),
  );

  // ✅ Apply date filter to both lists
  const assignedToMe = useMemo(
    () => filterByDateRange(assignedToMeAll),
    [assignedToMeAll, dateFrom, dateTo]
  );

  const raisedByMe = useMemo(
    () => filterByDateRange(raisedByMeAll),
    [raisedByMeAll, dateFrom, dateTo]
  );

  const currentList = activeTab === "assigned" ? assignedToMe : raisedByMe;

  const isOverdue = (ticket) => {
    const statusLower = ticket.status?.toLowerCase();
    if (statusLower === "completed" || statusLower === "rejected") return false;

    const checkDate =
      ticket.revisedDate || ticket.confirmedDate || ticket.desiredDate;
    if (!checkDate) return false;

    const dueDate = parseDDMMYYYY(checkDate);
    if (!dueDate) return false;

    return new Date() > dueDate;
  };

  // ✅ Count from UNFILTERED assigned list (bell badge shouldn't change with date filter)
  const activeAssignedCount = assignedToMeAll.filter(
    (t) =>
      t.status?.toLowerCase() !== "completed" &&
      t.status?.toLowerCase() !== "rejected",
  ).length;

  const overdueCount = assignedToMeAll.filter(isOverdue).length;

  const getStats = (list) => ({
    total: list.length,
    open: list.filter((t) => t.status === "Open").length,
    confirmed: list.filter((t) => t.status === "PC Confirmed").length,
    inProgress: list.filter((t) => t.status === "In Progress").length,
    revision: list.filter((t) => t.status === "Date Revision Requested").length,
    completed: list.filter((t) => t.status === "Completed").length,
    rejected: list.filter((t) => t.status === "Rejected").length,
    overdue: list.filter(isOverdue).length,
  });

  const stats = getStats(currentList);

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

  const sortedList = [...currentList].sort((a, b) => {
    const aOv = isOverdue(a);
    const bOv = isOverdue(b);
    if (aOv && !bOv) return -1;
    if (!aOv && bOv) return 1;
    const aComp = a.status === "Completed";
    const bComp = b.status === "Completed";
    if (!aComp && bComp) return -1;
    if (aComp && !bComp) return 1;
    return new Date(a.desiredDate || 0) - new Date(b.desiredDate || 0);
  });

  // ✅ Quick date presets
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
      setDateFrom(t);
      setDateTo(t);
    } else if (preset === "week") {
      const start = new Date(today);
      start.setDate(today.getDate() - 7);
      setDateFrom(fmt(start));
      setDateTo(fmt(today));
    } else if (preset === "month") {
      const start = new Date(today);
      start.setDate(today.getDate() - 30);
      setDateFrom(fmt(start));
      setDateTo(fmt(today));
    } else if (preset === "thisMonth") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setDateFrom(fmt(start));
      setDateTo(fmt(today));
    } else if (preset === "clear") {
      setDateFrom("");
      setDateTo("");
    }
  };

  const hasDateFilter = dateFrom || dateTo;

  return (
    <div className="notification-panel-wrapper">
      {/* Bell Button */}
      <button
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        title="My Tickets"
      >
        <i className="bi bi-bell-fill"></i>
        {activeAssignedCount > 0 && (
          <span
            className={`notification-badge ${overdueCount > 0 ? "badge-danger" : ""}`}
          >
            {activeAssignedCount}
          </span>
        )}
      </button>

      {/* Half-screen Slide Panel */}
      {isOpen && (
        <>
          <div
            className="notif-panel-backdrop"
            onClick={() => setIsOpen(false)}
          />
          <div className="notif-panel">
            {/* Header */}
            <div className="notif-panel-header">
              <h3>
                <i
                  className="bi bi-ticket-perforated"
                  style={{ marginRight: 8 }}
                ></i>
                My Tickets
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* ✅ Filter Toggle Button */}
                <button
                  className="notif-filter-toggle"
                  onClick={() => setShowFilters(!showFilters)}
                  title="Toggle Date Filters"
                  style={{
                    background: hasDateFilter
                      ? "rgba(99, 102, 241, 0.15)"
                      : "transparent",
                    border: hasDateFilter
                      ? "1px solid #6366f1"
                      : "1px solid var(--border-primary, #e5e7eb)",
                    color: hasDateFilter ? "#6366f1" : "var(--text-secondary, #6b7280)",
                    padding: "6px 10px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontWeight: 500,
                  }}
                >
                  <i className="bi bi-funnel"></i>
                  Filter
                  {hasDateFilter && (
                    <span
                      style={{
                        background: "#6366f1",
                        color: "#fff",
                        borderRadius: 10,
                        padding: "1px 6px",
                        fontSize: 10,
                        fontWeight: 600,
                        marginLeft: 2,
                      }}
                    >
                      ON
                    </span>
                  )}
                </button>
                <button className="close-btn" onClick={() => setIsOpen(false)}>
                  &times;
                </button>
              </div>
            </div>

            {/* ✅ Date Filter Section (collapsible) */}
            {showFilters && (
              <div
                style={{
                  padding: "12px 16px",
                  background: "var(--bg-tertiary, #f9fafb)",
                  borderBottom: "1px solid var(--border-primary, #e5e7eb)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-secondary, #6b7280)",
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <i className="bi bi-calendar-range"></i>
                  Filter by Raised Date
                </div>

                {/* Date inputs */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        color: "var(--text-secondary, #6b7280)",
                        marginBottom: 3,
                      }}
                    >
                      From
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      max={dateTo || undefined}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        fontSize: 12,
                        border: "1px solid var(--border-primary, #d1d5db)",
                        borderRadius: 6,
                        background: "var(--bg-primary, #ffffff)",
                        color: "var(--text-primary, #111827)",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        color: "var(--text-secondary, #6b7280)",
                        marginBottom: 3,
                      }}
                    >
                      To
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      min={dateFrom || undefined}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        fontSize: 12,
                        border: "1px solid var(--border-primary, #d1d5db)",
                        borderRadius: 6,
                        background: "var(--bg-primary, #ffffff)",
                        color: "var(--text-primary, #111827)",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                {/* Quick presets */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  {[
                    { key: "today", label: "Today" },
                    { key: "week", label: "Last 7 Days" },
                    { key: "month", label: "Last 30 Days" },
                    { key: "thisMonth", label: "This Month" },
                  ].map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setQuickRange(p.key)}
                      style={{
                        padding: "4px 10px",
                        fontSize: 11,
                        border: "1px solid var(--border-primary, #d1d5db)",
                        borderRadius: 12,
                        background: "var(--bg-primary, #ffffff)",
                        color: "var(--text-primary, #374151)",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                  {hasDateFilter && (
                    <button
                      onClick={() => setQuickRange("clear")}
                      style={{
                        padding: "4px 10px",
                        fontSize: 11,
                        border: "1px solid #ef4444",
                        borderRadius: 12,
                        background: "rgba(239, 68, 68, 0.08)",
                        color: "#ef4444",
                        cursor: "pointer",
                        fontWeight: 500,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      <i className="bi bi-x-circle"></i>
                      Clear
                    </button>
                  )}
                </div>

                {/* Active filter info */}
                {hasDateFilter && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "6px 10px",
                      background: "rgba(99, 102, 241, 0.08)",
                      border: "1px solid rgba(99, 102, 241, 0.2)",
                      borderRadius: 6,
                      fontSize: 11,
                      color: "#6366f1",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <i className="bi bi-info-circle-fill"></i>
                    Showing tickets raised
                    {dateFrom && (
                      <>
                        {" "}
                        from <strong>{dateFrom}</strong>
                      </>
                    )}
                    {dateTo && (
                      <>
                        {" "}
                        to <strong>{dateTo}</strong>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Two Tabs */}
            <div className="notif-panel-tabs">
              <button
                className={`notif-tab ${activeTab === "assigned" ? "active" : ""}`}
                onClick={() => setActiveTab("assigned")}
              >
                <i
                  className="bi bi-person-check"
                  style={{ marginRight: 6 }}
                ></i>
                Assigned to Me
                <span className="notif-tab-count">{assignedToMe.length}</span>
              </button>
              <button
                className={`notif-tab ${activeTab === "raised" ? "active" : ""}`}
                onClick={() => setActiveTab("raised")}
              >
                <i className="bi bi-send" style={{ marginRight: 6 }}></i>
                Raised by Me
                <span className="notif-tab-count">{raisedByMe.length}</span>
              </button>
            </div>

            {/* Mini Stats */}
            <div className="notif-panel-stats">
              <div className="notif-stat">
                <span className="notif-stat-num">{stats.total}</span>
                <span className="notif-stat-label">Total</span>
              </div>
              <div className="notif-stat">
                <span
                  className="notif-stat-num"
                  style={{ color: "var(--accent-yellow)" }}
                >
                  {stats.open}
                </span>
                <span className="notif-stat-label">Open</span>
              </div>
              <div className="notif-stat">
                <span
                  className="notif-stat-num"
                  style={{ color: "var(--accent-hover)" }}
                >
                  {stats.inProgress}
                </span>
                <span className="notif-stat-label">Progress</span>
              </div>
              <div className="notif-stat">
                <span
                  className="notif-stat-num"
                  style={{ color: "var(--accent-green)" }}
                >
                  {stats.completed}
                </span>
                <span className="notif-stat-label">Done</span>
              </div>
              {stats.overdue > 0 && (
                <div className="notif-stat">
                  <span
                    className="notif-stat-num"
                    style={{ color: "var(--accent-red)" }}
                  >
                    {stats.overdue}
                  </span>
                  <span className="notif-stat-label">Overdue</span>
                </div>
              )}
              {stats.rejected > 0 && (
                <div className="notif-stat">
                  <span
                    className="notif-stat-num"
                    style={{ color: "var(--accent-red)" }}
                  >
                    {stats.rejected}
                  </span>
                  <span className="notif-stat-label">Rejected</span>
                </div>
              )}
            </div>

            {/* Ticket List */}
            <div className="notif-panel-list">
              {isLoading ? (
                <div className="notification-loading">
                  <div
                    className="spinner"
                    style={{ width: 16, height: 16, borderWidth: 2 }}
                  ></div>
                  <span style={{ marginLeft: 8 }}>Loading...</span>
                </div>
              ) : sortedList.length === 0 ? (
                <div className="notification-empty">
                  <i className="bi bi-inbox"></i>
                  <p>
                    {hasDateFilter
                      ? "No tickets found in selected date range"
                      : activeTab === "assigned"
                        ? "No tickets assigned to you"
                        : "You haven't raised any tickets"}
                  </p>
                  {hasDateFilter && (
                    <button
                      onClick={() => setQuickRange("clear")}
                      style={{
                        marginTop: 10,
                        padding: "6px 14px",
                        fontSize: 12,
                        border: "1px solid #6366f1",
                        borderRadius: 6,
                        background: "rgba(99, 102, 241, 0.1)",
                        color: "#6366f1",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      <i className="bi bi-x-circle" style={{ marginRight: 4 }}></i>
                      Clear Date Filter
                    </button>
                  )}
                </div>
              ) : (
                sortedList.map((ticket) => {
                  const ov = isOverdue(ticket);
                  const displayStatus = ov ? "Overdue" : ticket.status;
                  return (
                    <div
                      key={ticket.ticketId}
                      className={`notif-panel-item ${ov ? "overdue" : ""} ${ticket.status === "Completed" ? "completed" : ""}`}
                      onClick={() => {
                        onTicketClick?.(ticket);
                        setIsOpen(false);
                      }}
                    >
                      <div className="notif-item-top">
                        <span className="notif-item-id">{ticket.ticketId}</span>
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

                      <div className="notif-item-client">
                        {ticket.clientName} — {ticket.enqNo}
                      </div>

                      <div className="notif-item-issue">
                        {ticket.issueDescription}
                      </div>

                      <div className="notif-item-meta">
                        <span className="notif-meta-raised">
                          <i className="bi bi-calendar-plus"></i>
                          Raised: {ticket.raisedDate || "—"}
                        </span>
                        <span>
                          <i className="bi bi-calendar3"></i>
                          Due:{" "}
                          {ticket.revisedDate ||
                            ticket.confirmedDate ||
                            ticket.desiredDate ||
                            "—"}
                        </span>
                        {activeTab === "raised" && (
                          <span>
                            <i className="bi bi-person"></i>
                            Assigned: {ticket.assignedTo}
                          </span>
                        )}
                        {activeTab === "assigned" && (
                          <span>
                            <i className="bi bi-person"></i>
                            Raised By: {ticket.raisedBy}
                          </span>
                        )}
                        <span>
                          <i className="bi bi-tag"></i>
                          {ticket.sourceTab}
                          {ticket.stepName ? ` / ${ticket.stepName}` : ""}
                        </span>
                      </div>

                      {parseInt(ticket.revisionCount) > 0 && (
                        <div className="notif-item-revision">
                          <i
                            className="bi bi-arrow-repeat"
                            style={{ marginRight: 4 }}
                          ></i>
                          {ticket.revisionCount} revision(s) — Last:{" "}
                          {ticket.revisedDate}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}