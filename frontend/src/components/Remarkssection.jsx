import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import api from "../api.js";

// ============ INLINE STYLES ============
const rsStyles = {
  container: {
    marginBottom: "20px",
  },
  // --- Old Remarks Section ---
  oldRemarksCard: {
    backgroundColor: "var(--bg-tertiary, #f3f4f6)",
    borderRadius: "8px",
    padding: "14px 16px",
    marginBottom: "16px",
    maxHeight: "200px",
    overflowY: "auto",
  },
  oldRemarksTitle: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--text-primary, #111827)",
    marginBottom: "10px",
  },
  remarkItem: {
    padding: "8px 0",
    borderBottom: "1px solid var(--border-secondary, #e5e7eb)",
  },
  remarkItemLast: {
    padding: "8px 0",
  },
  remarkMeta: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "4px",
  },
  remarkTimestamp: {
    fontSize: "11px",
    color: "var(--text-secondary, #9ca3af)",
    fontWeight: 500,
  },
  remarkStep: {
    fontSize: "11px",
    color: "#6366f1",
    fontWeight: 600,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    padding: "2px 8px",
    borderRadius: "10px",
  },
  remarkText: {
    fontSize: "13px",
    color: "var(--text-primary, #111827)",
    lineHeight: 1.4,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  noRemarks: {
    fontSize: "13px",
    color: "var(--text-secondary, #9ca3af)",
    fontStyle: "italic",
    textAlign: "center",
    padding: "8px 0",
  },
  loadingRemarks: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px 0",
    fontSize: "13px",
    color: "var(--text-secondary, #9ca3af)",
  },
  // --- New Remark Section ---
  newRemarkGroup: {
    marginBottom: "0",
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--text-primary, #111827)",
    marginBottom: "8px",
  },
  textareaRow: {
    display: "flex",
    gap: "8px",
    alignItems: "flex-start",
  },
  formTextarea: {
    flex: 1,
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid var(--border-primary, #d1d5db)",
    borderRadius: "8px",
    backgroundColor: "var(--bg-primary, #ffffff)",
    color: "var(--text-primary, #111827)",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
    boxSizing: "border-box",
    minHeight: "60px",
  },
  btnSaveRemark: {
    padding: "10px 14px",
    fontSize: "13px",
    fontWeight: 500,
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#8b5cf6",
    color: "#ffffff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "background-color 0.2s",
    whiteSpace: "nowrap",
    flexShrink: 0,
    alignSelf: "flex-end",
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  spinnerSmall: {
    width: "14px",
    height: "14px",
    border: "2px solid rgba(255, 255, 255, 0.3)",
    borderTopColor: "#ffffff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    display: "inline-block",
  },
  divider: {
    border: "none",
    borderTop: "1px solid var(--border-primary, #e5e7eb)",
    margin: "16px 0",
  },
};

/**
 * RemarksSection — Reusable component for all step modals
 * 
 * Props:
 * @param {string} enqNo — The enquiry number to fetch/save remarks for
 * @param {string} stepName — e.g. "Step 2: Document Upload", "Step 3: Need Analysis Meeting"
 * @param {boolean} disabled — Disable inputs when parent is submitting
 * @param {React.Ref} ref — (optional) expose { getRemarkText, clearRemark, saveRemark } to parent
 */
const RemarksSection = React.forwardRef(({ enqNo, stepName, disabled = false }, ref) => {
  const [remarkText, setRemarkText] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  // Fetch old remarks for this enqNo
  const { data, isLoading } = useQuery({
    queryKey: ["remarks", enqNo],
    queryFn: () => api.get(`/remarks?enqNo=${encodeURIComponent(enqNo)}`).then((r) => r.data),
    enabled: !!enqNo,
    staleTime: 30000,
  });

  const oldRemarks = data?.remarks || [];

  // Save remark independently
  const saveRemark = useCallback(async (textOverride) => {
    const text = textOverride !== undefined ? textOverride : remarkText;
    if (!text || !text.trim()) return false;

    setSaving(true);
    try {
      await api.post("/remarks", {
        enqNo,
        stepName: stepName || "",
        remark: text.trim(),
      });
      queryClient.invalidateQueries(["remarks", enqNo]);
      setRemarkText("");
      return true;
    } catch (err) {
      console.error("Save remark error:", err);
      toast.error("Failed to save remark: " + (err.response?.data?.error || err.message));
      return false;
    } finally {
      setSaving(false);
    }
  }, [enqNo, stepName, remarkText, queryClient]);

  // Expose methods to parent via ref
  React.useImperativeHandle(ref, () => ({
    getRemarkText: () => remarkText,
    clearRemark: () => setRemarkText(""),
    saveRemark: (text) => saveRemark(text),
  }));

  const handleSaveClick = async () => {
    if (!remarkText.trim()) {
      toast.warn("Please enter a remark first");
      return;
    }
    const ok = await saveRemark();
    if (ok) toast.success("Remark saved!");
  };

  const isDisabled = disabled || saving;

  return (
    <div style={rsStyles.container}>
      <hr style={rsStyles.divider} />

      {/* Old Remarks */}
      <div style={rsStyles.oldRemarksCard}>
        <div style={rsStyles.oldRemarksTitle}>
          <i className="bi bi-clock-history"></i>
          Previous Remarks
        </div>

        {isLoading ? (
          <div style={rsStyles.loadingRemarks}>
            <span style={rsStyles.spinnerSmall}></span>
            Loading remarks...
          </div>
        ) : oldRemarks.length === 0 ? (
          <div style={rsStyles.noRemarks}>No remarks yet</div>
        ) : (
          oldRemarks.map((r, idx) => (
            <div
              key={idx}
              style={idx === oldRemarks.length - 1 ? rsStyles.remarkItemLast : rsStyles.remarkItem}
            >
              <div style={rsStyles.remarkMeta}>
                <span style={rsStyles.remarkTimestamp}>{r.timestamp}</span>
                {r.stepName && <span style={rsStyles.remarkStep}>{r.stepName}</span>}
              </div>
              <div style={rsStyles.remarkText}>{r.remark}</div>
            </div>
          ))
        )}
      </div>

      {/* New Remark */}
      <div style={rsStyles.newRemarkGroup}>
        <label style={rsStyles.label}>
          <i className="bi bi-chat-left-text"></i>
          Add Remark
        </label>
        <div style={rsStyles.textareaRow}>
          <textarea
            style={{
              ...rsStyles.formTextarea,
              ...(isDisabled && rsStyles.btnDisabled),
            }}
            placeholder="Enter remark..."
            value={remarkText}
            onChange={(e) => setRemarkText(e.target.value)}
            disabled={isDisabled}
            rows={2}
          />
          <button
            style={{
              ...rsStyles.btnSaveRemark,
              ...((isDisabled || !remarkText.trim()) && rsStyles.btnDisabled),
            }}
            onClick={handleSaveClick}
            disabled={isDisabled || !remarkText.trim()}
          >
            {saving ? (
              <span style={rsStyles.spinnerSmall}></span>
            ) : (
              <i className="bi bi-send"></i>
            )}
            Save
          </button>
        </div>
      </div>
    </div>
  );
});

RemarksSection.displayName = "RemarksSection";
export default RemarksSection;