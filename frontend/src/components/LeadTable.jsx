import React from "react";

export default function LeadTable({ leads, onAction, onNextAction, actionLabel = "Action", loading, emptyMessage = "No leads found" }) {
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>Loading leads...</span>
      </div>
    );
  }

  if (!leads || leads.length === 0) {
    return (
      <div className="empty-state">
        <i className="bi bi-inbox"></i>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>EnQ No</th>
              <th>Client Name</th>
              <th>Lead From</th>
              <th>Partner Type</th>
              <th>Purpose</th>
              <th>Location</th>
              <th>Contact</th>
              <th>Concern Person</th>
              {onNextAction && <th>NAP</th>}
              {onAction && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead, idx) => (
              <tr key={lead.enqNo || idx}>
                <td>{idx + 1}</td>
                <td className="td-enq">{lead.enqNo}</td>
                <td className="td-client">{lead.clientName}</td>
                <td>{lead.leadGeneratedFrom}</td>
                <td>
                  <span className={`badge ${lead.partnerType?.includes("Channel") ? "badge-purple" : "badge-blue"}`}>
                    {lead.partnerType?.replace("CP(Channel Partner)", "CP").replace("DP(Direct Partner)", "DP").replace("DP(Direct Patner)", "DP") || "—"}
                  </span>
                </td>
                <td>{lead.purpose}</td>
                <td style={{ maxWidth: 180 }}>{lead.location}</td>
                <td>{lead.contactInfo}</td>
                <td>{lead.concernPerson}</td>
                {onNextAction && (
                  <td>
                    <button
                      className="btn btn-nap"
                      onClick={() => onNextAction(lead)}
                      title="Raise Next Action Plan Ticket"
                    >
                      <i className="bi bi-ticket-perforated"></i>
                    </button>
                  </td>
                )}
                {onAction && (
                  <td>
                    <button className="btn btn-action" onClick={() => onAction(lead)}>
                      <i className="bi bi-pencil-square"></i>
                      {actionLabel}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}