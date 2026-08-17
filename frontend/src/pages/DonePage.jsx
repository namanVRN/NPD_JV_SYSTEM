import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api.js";
import LeadTable from "../components/LeadTable.jsx";

export default function DonePage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["done"],
    queryFn: () => api.get("/done/list").then((r) => r.data),
  });

  const leads = data?.leads || [];

  const filteredLeads = leads.filter((lead) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (lead.clientName || "").toLowerCase().includes(q) ||
      (lead.enqNo || "").toLowerCase().includes(q) ||
      (lead.location || "").toLowerCase().includes(q) ||
      (lead.concernPerson || "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">
          <i className="bi bi-check-circle" style={{ marginRight: 10, color: "var(--accent-green)" }}></i>
          Done
        </h2>
        <span className="badge badge-green">{filteredLeads.length} leads</span>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          className="filter-input"
          placeholder="Search by client name, EnQ No, location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {error && (
        <div style={{ color: "var(--accent-red)", padding: 20, textAlign: "center" }}>
          <i className="bi bi-exclamation-triangle" style={{ marginRight: 8 }}></i>
          Failed to load: {error.message}
        </div>
      )}

      <LeadTable
        leads={filteredLeads}
        loading={isLoading}
        emptyMessage="No completed leads yet."
      />
    </div>
  );
}