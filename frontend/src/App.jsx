import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import api from "./api.js";
import LoginPage from "./pages/LoginPage.jsx";
import PipelinePage from "./pages/PipelinePage.jsx";
import NotQualifiedPage from "./pages/NotQualifiedPage.jsx";
import ColdLeadsPage from "./pages/ColdLeadsPage.jsx";
import FMSPage from "./pages/FMSPage.jsx";
import DonePage from "./pages/DonePage.jsx";
import NextActionPlanPage from "./pages/NextActionPlanPage";
import NextActionModal from "./components/NextActionModal";
import NotificationPanel from "./components/NotificationPanel";
import TicketUpdateModal from "./components/TicketUpdateModal";
import SiteVisitPage from "./pages/SiteVisitPage.jsx";
import LeadAssignmentPage from "./pages/LeadAssignmentPage.jsx";

const ALL_TABS = [
  {
    id: "pipeline",
    label: "Pipeline",
    icon: "bi-funnel",
    sheetName: "PIPELINE",
  },
  {
    id: "not-qualified",
    label: "Not Qualified",
    icon: "bi-x-circle",
    sheetName: "NOT QUALIFIED LEADS",
  },
  {
    id: "cold-leads",
    label: "Cold Leads",
    icon: "bi-snow2",
    sheetName: "COLD LEADS",
  },
  { id: "fms", label: "FMS", icon: "bi-diagram-3", sheetName: "FMS" },
  { id: "done", label: "Done", icon: "bi-check-circle", sheetName: "DONE" },
  {
    id: "next-action-plan",
    label: "Next Action Plan",
    icon: "bi-ticket-perforated",
    sheetName: "NEXT ACTION PLAN",
  },
  {
    id: "site-visit",
    label: "Site Visit",
    icon: "bi-geo-alt",
    sheetName: "SITE VIST FMS",
  },
  {
    id: "lead-assignment",
    label: "Lead Assignment",
    icon: "bi-person-badge",
    sheetName: "ASSIGNMENT LOGGER",
  },
];

function getVisibleTabs(user) {
  if (!user) return [];
  const workingTabs = (user.workingTabs || "All").trim();

  if (workingTabs.toLowerCase() === "all") {
    return ALL_TABS;
  }

  const allowedNames = workingTabs
    .split(",")
    .map((t) => t.trim().toUpperCase());

  return ALL_TABS.filter((tab) => {
    const sheetUpper = tab.sheetName.toUpperCase();
    const labelUpper = tab.label.toUpperCase();
    return allowedNames.some(
      (name) =>
        sheetUpper.includes(name) ||
        labelUpper.includes(name) ||
        name.includes(sheetUpper) ||
        name.includes(labelUpper),
    );
  });
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState("");
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();
  const [showNapModal, setShowNapModal] = useState(false);
  const [napLead, setNapLead] = useState(null);
  const [napSource, setNapSource] = useState("");
  const [napStep, setNapStep] = useState("");
  const [showTicketUpdate, setShowTicketUpdate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("jv_theme") || "dark";
  });

  // Apply theme on mount and change
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("jv_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    const saved = localStorage.getItem("jv_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        api
          .post("/auth/verify", { userId: parsed.userId })
          .then((res) => {
            setUser(res.data.user);
            localStorage.setItem("jv_user", JSON.stringify(res.data.user));
          })
          .catch(() => {
            localStorage.removeItem("jv_user");
          })
          .finally(() => setAuthChecked(true));
      } catch {
        localStorage.removeItem("jv_user");
        setAuthChecked(true);
      }
    } else {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    if (user) {
      const tabs = getVisibleTabs(user);
      if (tabs.length > 0 && !activeTab) {
        setActiveTab(tabs[0].id);
      }
    }
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("jv_user");
    setUser(null);
    setActiveTab("");
    queryClient.clear();
    toast.info("Logged out successfully");
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.post("/sync");
      toast.success(res.data.message);
      queryClient.invalidateQueries();
    } catch (err) {
      toast.error("Sync failed: " + (err.response?.data?.error || err.message));
    } finally {
      setSyncing(false);
    }
  };

  const handleNextAction = (lead, sourceTab, stepName = "") => {
    setNapLead(lead);
    setNapSource(sourceTab);
    setNapStep(stepName);
    setShowNapModal(true);
  };

  const handleNotifTicketClick = (ticket) => {
    setSelectedTicket(ticket);
    setShowTicketUpdate(true);
  };

  if (!authChecked) {
    return (
      <div className="login-container">
        <div className="loading">
          <div className="spinner"></div>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const visibleTabs = getVisibleTabs(user);

  const renderPage = () => {
    switch (activeTab) {
      case "pipeline":
        return (
          <PipelinePage
            onNextAction={(lead) => handleNextAction(lead, "Pipeline")}
          />
        );
      case "not-qualified":
        return (
          <NotQualifiedPage
            onNextAction={(lead) => handleNextAction(lead, "Not Qualified")}
          />
        );
      case "cold-leads":
        return (
          <ColdLeadsPage
            onNextAction={(lead) => handleNextAction(lead, "Cold Leads")}
          />
        );
      case "fms":
        return <FMSPage currentUser={user} onNextAction={handleNextAction} />;
      case "done":
        return <DonePage />;
      case "next-action-plan":
        return <NextActionPlanPage currentUser={user} />;
      case "site-visit":
        return (
          <SiteVisitPage currentUser={user} onNextAction={handleNextAction} />
        );
      case "lead-assignment":
        return <LeadAssignmentPage currentUser={user} />;
      default:
        return visibleTabs.length > 0 ? (
          <div className="empty-state">
            <i className="bi bi-hand-index"></i>
            <p>Select a tab to get started</p>
          </div>
        ) : (
          <div className="empty-state">
            <i className="bi bi-lock"></i>
            <p>No tabs assigned. Contact Admin.</p>
          </div>
        );
    }
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>
          <i className="bi bi-buildings"></i>
          <span>JV</span> Lead Management
        </h1>
        <div className="header-actions">
          <button
            className="btn btn-sync"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <>
                <span
                  className="spinner"
                  style={{ width: 14, height: 14, borderWidth: 2 }}
                ></span>
                Syncing...
              </>
            ) : (
              <>
                <i className="bi bi-arrow-repeat"></i>
                Sync Leads
              </>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={
              theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"
            }
          >
            <i
              className={`bi ${theme === "dark" ? "bi-sun-fill" : "bi-moon-fill"}`}
            ></i>
          </button>

          {/* Notification Bell — shows assigned tickets to logged-in user */}
          <NotificationPanel
            currentUser={user}
            onTicketClick={handleNotifTicketClick}
          />

          <div className="user-info">
            <div className="user-avatar">
              {user.userName.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <span className="user-name">{user.userName}</span>
              <span className="user-role">{user.role}</span>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleLogout}
              title="Logout"
            >
              <i className="bi bi-box-arrow-right"></i>
            </button>
          </div>
        </div>
      </header>

      <nav className="top-tabs">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            className={`top-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <i className={`bi ${tab.icon}`} style={{ marginRight: 6 }}></i>
            {tab.label}
          </button>
        ))}
        <button
          className="top-tab"
          onClick={() =>
            window.open(
              "https://script.google.com/macros/s/AKfycbzUQNynbHkRRB0snjfZ3JlI0HJnJQnIb5jtnGfif-eNPYtJiQX9FY2j0XQHPoFpdXCJ/exec",
              "_blank",
            )
          }
        >
          <i className="bi bi-plus-circle" style={{ marginRight: 6 }}></i>
          Enquiry Form
        </button>
      </nav>

      <main className="page-content">{renderPage()}</main>

      {/* Next Action Plan — Raise Ticket Modal */}
      <NextActionModal
        show={showNapModal}
        onClose={() => setShowNapModal(false)}
        lead={napLead}
        sourceTab={napSource}
        stepName={napStep}
        currentUser={user}
      />

      {/* Ticket Update Modal — opened from Notification Panel */}
      <TicketUpdateModal
        show={showTicketUpdate}
        onClose={() => {
          setShowTicketUpdate(false);
          setSelectedTicket(null);
        }}
        ticket={selectedTicket}
        currentUser={user}
      />
    </div>
  );
}
