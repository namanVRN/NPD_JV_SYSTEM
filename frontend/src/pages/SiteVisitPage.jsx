import React, { useState } from "react";
import SiteVisitEcs from "./siteVisit/steps/SiteVisitEcs.jsx";
import SvStep2 from "./siteVisit/steps/SvStep2.jsx";
import SvStep3 from "./siteVisit/steps/SvStep3.jsx";

const SV_STEPS = [
  { id: 1, label: "ECS Leads", icon: "bi-list-check" },
  { id: 2, label: "Scheduling", icon: "bi-calendar-check" },
  { id: 3, label: "Land Observations", icon: "bi-binoculars" },
];

export default function SiteVisitPage({ currentUser, onNextAction }) {
  const [activeStep, setActiveStep] = useState(1);

  const renderStepContent = () => {
    switch (activeStep) {
      case 1: return <SiteVisitEcs currentUser={currentUser} onNextAction={onNextAction} />;
      case 2: return <SvStep2 currentUser={currentUser} onNextAction={onNextAction} />;
      case 3: return <SvStep3 currentUser={currentUser} onNextAction={onNextAction} />;
      default: return null;
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">
          <i className="bi bi-geo-alt" style={{ marginRight: 10, color: "var(--accent-green)" }}></i>
          Site Visit Management
        </h2>
      </div>

      <div className="fms-sub-tabs">
        {SV_STEPS.map((step) => (
          <button
            key={step.id}
            className={`fms-sub-tab ${activeStep === step.id ? "active" : ""}`}
            onClick={() => setActiveStep(step.id)}
          >
            <i className={`bi ${step.icon}`} style={{ marginRight: 6 }}></i>
            Step {step.id}: {step.label}
          </button>
        ))}
      </div>

      {renderStepContent()}
    </div>
  );
}