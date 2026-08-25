// import React, { useState } from "react";
// import { useQuery } from "@tanstack/react-query";
// import api from "../api.js";

// // ✅ केवल सही URL (जिसमें http/https/drive.google.com हो) को ही वैलिड मानेगा
// function getValidUrl(urlStr) {
//   if (!urlStr) return null;
//   const str = urlStr.trim();
//   if (!str) return null;

//   if (str.startsWith("http://") || str.startsWith("https://")) {
//     return str;
//   }
//   if (
//     str.startsWith("drive.google.com") ||
//     str.startsWith("docs.google.com") ||
//     str.startsWith("www.")
//   ) {
//     return `https://${str}`;
//   }

//   // अगर प्लेन टेक्स्ट है जैसे "PDF file of the Plan", तो null रिटर्न करेगा
//   return null;
// }

// export default function DonePage() {
//   const [searchQuery, setSearchQuery] = useState("");

//   const { data, isLoading, error } = useQuery({
//     queryKey: ["done"],
//     queryFn: () => api.get("/done/list").then((r) => r.data),
//   });

//   const leads = data?.leads || [];

//   const filteredLeads = leads.filter((lead) => {
//     if (!searchQuery) return true;
//     const q = searchQuery.toLowerCase();
//     return (
//       (lead.clientName || "").toLowerCase().includes(q) ||
//       (lead.enqNo || "").toLowerCase().includes(q) ||
//       (lead.location || "").toLowerCase().includes(q) ||
//       (lead.concernPerson || "").toLowerCase().includes(q) ||
//       (lead.leadGeneratedFrom || "").toLowerCase().includes(q)
//     );
//   });

//   return (
//     <div className="step-content">
//       <div
//         className="page-header"
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: "20px",
//         }}
//       >
//         <h2
//           className="page-title"
//           style={{
//             margin: 0,
//             display: "flex",
//             alignItems: "center",
//             gap: "10px",
//           }}
//         >
//           <i className="bi bi-check-circle" style={{ color: "#22c55e" }}></i>
//           Done
//         </h2>
//         <span
//           className="badge badge-green"
//           style={{
//             background: "rgba(34, 197, 94, 0.1)",
//             color: "#22c55e",
//             padding: "6px 12px",
//             borderRadius: "20px",
//             fontWeight: 600,
//           }}
//         >
//           {filteredLeads.length} LEADS
//         </span>
//       </div>

//       <div className="filter-bar" style={{ marginBottom: "20px" }}>
//         <div className="search-box" style={{ position: "relative", width: "100%", maxWidth: "320px" }}>
//           <input
//             type="text"
//             className="filter-input"
//             placeholder="Search by client name, EnQ No..."
//             value={searchQuery}
//             onChange={(e) => setSearchQuery(e.target.value)}
//             style={{
//               width: "100%",
//               padding: "10px 14px",
//               borderRadius: "8px",
//               border: "1px solid var(--border-primary, #e5e7eb)",
//               outline: "none",
//             }}
//           />
//         </div>
//       </div>

//       {error && (
//         <div style={{ color: "#ef4444", padding: 20, textAlign: "center" }}>
//           <i className="bi bi-exclamation-triangle" style={{ marginRight: 8 }}></i>
//           Failed to load: {error.message}
//         </div>
//       )}

//       {isLoading ? (
//         <div className="loading" style={{ textAlign: "center", padding: "40px 0" }}>
//           <div className="spinner"></div>
//           <span>Loading completed leads...</span>
//         </div>
//       ) : filteredLeads.length === 0 ? (
//         <div className="empty-state" style={{ textAlign: "center", padding: "40px 0", color: "#6b7280" }}>
//           <i className="bi bi-inbox" style={{ fontSize: "36px" }}></i>
//           <p>No completed leads yet.</p>
//         </div>
//       ) : (
//         <div className="table-wrapper">
//           <table className="lead-table">
//             <thead>
//               <tr>
//                 <th>#</th>
//                 <th>ENQ NO</th>
//                 <th>CLIENT NAME</th>
//                 <th>LEAD FROM</th>
//                 <th>PARTNER TYPE</th>
//                 <th>PURPOSE</th>
//                 <th>LOCATION</th>
//                 <th>CONTACT</th>
//                 <th>CONCERN PERSON</th>
//                 <th style={{ textAlign: "center" }}>VIEW PDF</th>
//               </tr>
//             </thead>
//             <tbody>
//               {filteredLeads.map((lead, idx) => {
//                 const validUrl = getValidUrl(lead.pdfFolder);

//                 return (
//                   <tr key={lead.enqNo || idx}>
//                     <td>{idx + 1}</td>
//                     <td style={{ color: "#6366f1", fontWeight: 600 }}>{lead.enqNo || "—"}</td>
//                     <td style={{ fontWeight: 600 }}>{lead.clientName || "—"}</td>
//                     <td>{lead.leadGeneratedFrom || "—"}</td>
//                     <td>
//                       {lead.partnerType ? (
//                         <span
//                           style={{
//                             padding: "3px 8px",
//                             borderRadius: "12px",
//                             background: "rgba(99, 102, 241, 0.1)",
//                             color: "#6366f1",
//                             fontSize: "12px",
//                             fontWeight: 600,
//                           }}
//                         >
//                           {lead.partnerType}
//                         </span>
//                       ) : (
//                         "—"
//                       )}
//                     </td>
//                     <td>{lead.purpose || "—"}</td>
//                     <td>{lead.location || "—"}</td>
//                     <td>{lead.contactInfo || "—"}</td>
//                     <td>{lead.concernPerson || "—"}</td>

//                     {/* ✅ View PDF Cell */}
//                     <td style={{ textAlign: "center" }}>
//                       {validUrl ? (
//                         <a
//                           href={validUrl}
//                           target="_blank"
//                           rel="noopener noreferrer"
//                           style={{
//                             display: "inline-flex",
//                             alignItems: "center",
//                             justifyContent: "center",
//                             width: "32px",
//                             height: "32px",
//                             borderRadius: "6px",
//                             backgroundColor: "rgba(34, 197, 94, 0.15)",
//                             color: "#22c55e",
//                             border: "1px solid rgba(34, 197, 94, 0.3)",
//                             fontSize: "16px",
//                             cursor: "pointer",
//                             textDecoration: "none",
//                             transition: "all 0.2s",
//                           }}
//                           title="Open PDF / Google Drive Link"
//                         >
//                           <i className="bi bi-eye-fill"></i>
//                         </a>
//                       ) : (
//                         <span
//                           style={{ color: "#9ca3af", fontStyle: "italic", fontSize: "12px" }}
//                           title={
//                             lead.pdfFolder
//                               ? `Invalid URL Text: "${lead.pdfFolder}"`
//                               : "No Drive link available"
//                           }
//                         >
//                           —
//                         </span>
//                       )}
//                     </td>
//                   </tr>
//                 );
//               })}
//             </tbody>
//           </table>
//         </div>
//       )}
//     </div>
//   );
// }




import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api.js";

// ✅ Helper to validate Google Drive / Web URLs
function getValidUrl(urlStr) {
  if (!urlStr) return null;
  const str = urlStr.trim();
  if (!str) return null;

  if (str.startsWith("http://") || str.startsWith("https://")) {
    return str;
  }
  if (
    str.startsWith("drive.google.com") ||
    str.startsWith("docs.google.com") ||
    str.startsWith("www.")
  ) {
    return `https://${str}`;
  }

  return null;
}

export default function DonePage({ currentUser, onNextAction }) {
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
      (lead.concernPerson || "").toLowerCase().includes(q) ||
      (lead.leadGeneratedFrom || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="step-content">
      <div className="filter-bar">
        <div className="search-box">
          <i className="bi bi-search"></i>
          <input
            type="text"
            className="filter-input"
            placeholder="Search by client name, EnQ No, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery("")}>
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
          <span>Loading completed leads...</span>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="empty-state">
          <i className="bi bi-inbox"></i>
          <p>No completed leads yet.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="lead-table">
            <thead>
              <tr>
                <th>#</th>
                <th>ENQ NO</th>
                <th>CLIENT NAME</th>
                <th>LEAD FROM</th>
                <th>PARTNER TYPE</th>
                <th>PURPOSE</th>
                <th>LOCATION</th>
                <th>CONTACT</th>
                <th>CONCERN PERSON</th>
                <th style={{ textAlign: "center" }}>VIEW PDF</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead, idx) => {
                const validUrl = getValidUrl(lead.pdfFolder);

                return (
                  <tr key={lead.enqNo || idx}>
                    <td>{idx + 1}</td>
                    <td style={{ color: "#6366f1", fontWeight: 600 }}>{lead.enqNo || "—"}</td>
                    <td style={{ fontWeight: 600 }}>{lead.clientName || "—"}</td>
                    <td>{lead.leadGeneratedFrom || "—"}</td>
                    <td>
                      {lead.partnerType ? (
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "12px",
                            background: "rgba(99, 102, 241, 0.1)",
                            color: "#6366f1",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          {lead.partnerType}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{lead.purpose || "—"}</td>
                    <td>{lead.location || "—"}</td>
                    <td>{lead.contactInfo || "—"}</td>
                    <td>{lead.concernPerson || "—"}</td>

                    {/* ✅ VIEW PDF Cell */}
                    <td style={{ textAlign: "center" }}>
                      {validUrl ? (
                        <a
                          href={validUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "32px",
                            height: "32px",
                            borderRadius: "6px",
                            backgroundColor: "rgba(34, 197, 94, 0.15)",
                            color: "#22c55e",
                            border: "1px solid rgba(34, 197, 94, 0.3)",
                            fontSize: "16px",
                            textDecoration: "none",
                            cursor: "pointer",
                          }}
                          title="Open PDF / Google Drive Link"
                        >
                          <i className="bi bi-eye-fill"></i>
                        </a>
                      ) : (
                        <span style={{ color: "#9ca3af", fontStyle: "italic", fontSize: "12px" }}>
                          —
                        </span>
                      )}
                    </td>

                    {/* ✅ ALWAYS SHOW NAP BUTTON */}
                    <td className="actions-cell">
                      <button
                        className="btn btn-nap"
                        onClick={() => onNextAction && onNextAction(lead, "Done", "Done")}
                        title="Next Action Plan"
                      >
                        <i className="bi bi-ticket-perforated"></i>NAP
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}