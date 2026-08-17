import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import api from "../api.js";
import LeadTable from "../components/LeadTable.jsx";
import ActionModal from "../components/ActionModal.jsx";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active → Move to FMS" },
  { value: "BACK TO PIPELINE", label: "Back to Pipeline" },
  { value: "NOT QUALIFIED LEADS", label: "Move to Not Qualified" },
];

export default function ColdLeadsPage({ onNextAction }) {
  const [selectedLead, setSelectedLead] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["cold-leads"],
    queryFn: () => api.get("/cold-leads/list").then((r) => r.data),
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

  const handleUpdate = async ({ enqNo, status, remarks }) => {
    setUpdating(true);
    try {
      const res = await api.post("/cold-leads/update", { enqNo, status, remarks });
      toast.success(res.data.message);
      setSelectedLead(null);
      queryClient.invalidateQueries();
    } catch (err) {
      toast.error("Update failed: " + (err.response?.data?.error || err.message));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">
          <i className="bi bi-snow2" style={{ marginRight: 10, color: "var(--accent-blue)" }}></i>
          Cold Leads
        </h2>
        <span className="badge badge-blue">{filteredLeads.length} leads</span>
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
        onAction={setSelectedLead}
        onNextAction={onNextAction}
        actionLabel="Update"
        emptyMessage="No cold leads."
      />

      {selectedLead && (
        <ActionModal
          lead={selectedLead}
          statusOptions={STATUS_OPTIONS}
          onSubmit={handleUpdate}
          onClose={() => setSelectedLead(null)}
          loading={updating}
        />
      )}
    </div>
  );
}