// frontend/src/pages/InventoryPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import '../assets/InventoryPage.css';

export default function InventoryPage() {
  const [data, setData] = useState({ units: [], projectMaster: {}, projectDetails: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProject, setSelectedProject] = useState('');
  const [sortState, setSortState] = useState({ key: null, dir: 1 });
  const [modalUnit, setModalUnit] = useState(null);

  // Filters State
  const [filters, setFilters] = useState({
    project: '',
    status: '',
    unitType: '',
    facing: '',
    corner: '',
    garden: '',
    search: ''
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/inventory');
      if (!res.ok) throw new Error('Failed to load inventory data');
      const payload = await res.json();
      setData(payload);
      
      const projects = Object.keys(payload.projectMaster);
      if (projects.length > 0) {
        setSelectedProject(projects[0]);
      } else {
        const unitProjects = [...new Set((payload.units || []).map(u => u.project).filter(Boolean))];
        if (unitProjects.length > 0) setSelectedProject(unitProjects[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const clearFilters = () => {
    setFilters({
      project: '',
      status: '',
      unitType: '',
      facing: '',
      corner: '',
      garden: '',
      search: ''
    });
  };

  const filteredUnits = useMemo(() => {
    return data.units.filter(u => {
      if (filters.project && u.project !== filters.project) return false;
      if (filters.status && u.status !== filters.status) return false;
      if (filters.unitType && u.unitType !== filters.unitType) return false;
      if (filters.facing && u.facing !== filters.facing) return false;
      if (filters.corner && u.corner !== filters.corner) return false;
      if (filters.garden && u.garden !== filters.garden) return false;
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const combined = [u.unitCode, u.unitNo, u.block, u.location].join(' ').toLowerCase();
        if (!combined.includes(query)) return false;
      }
      return true;
    });
  }, [data.units, filters]);

  const sortedUnits = useMemo(() => {
    const list = [...filteredUnits];
    if (sortState.key) {
      const { key, dir } = sortState;
      list.sort((a, b) => {
        let va = a[key] ?? '';
        let vb = b[key] ?? '';
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
        return String(va).localeCompare(String(vb)) * dir;
      });
    }
    return list;
  }, [filteredUnits, sortState]);

  const handleSort = (key) => {
    setSortState(prev => {
      if (prev.key === key) return { key, dir: prev.dir * -1 };
      return { key, dir: 1 };
    });
  };

  const uniqueValues = (key) => [...new Set(data.units.map(u => u[key]).filter(Boolean))].sort();

  const formatRate = (u) => {
    const raw = u.rateRaw ? String(u.rateRaw) : '';
    if (!raw) return u.rate ? u.rate.toLocaleString('en-IN') : '—';
    const m = raw.match(/-?[\d,]+(\.\d+)?/);
    if (!m) return raw;
    const before = raw.slice(0, m.index).trim();
    const after = raw.slice(m.index + m[0].length).trim();
    const num = u.rate ? u.rate.toLocaleString('en-IN') : m[0];
    return [before, num, after].filter(Boolean).join(' ');
  };

  const isBlockColVisible = useMemo(() => {
    return [...new Set(filteredUnits.map(u => u.block))].length > 1;
  }, [filteredUnits]);

  const isFloorColVisible = useMemo(() => {
    return [...new Set(filteredUnits.map(u => u.floor))].length > 1;
  }, [filteredUnits]);

  const getPlotSizeForProject = (projectName) => {
    const units = data.units.filter(u => u.project === projectName);
    const areas = units.map(u => u.plotArea).filter(Boolean);
    if (areas.length) {
      const min = Math.min(...areas);
      const max = Math.max(...areas);
      return (min === max ? String(min) : `${min} – ${max}`) + ' sq.ft';
    }
    return '';
  };

  const downloadPDF = () => {
    if (!sortedUnits.length) return alert('No data to export.');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 40;

    const BRICK = [166, 80, 58];
    const INK = [24, 34, 52];
    const PAPER_ROW = [247, 243, 234];
    const GREEN = [47, 122, 77];
    const RED = [156, 59, 59];
    const AMBER = [155, 113, 38];

    doc.setFillColor(...BRICK);
    doc.rect(0, 0, pageW, 62, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('times', 'bold');
    doc.setFontSize(19);
    doc.text('SIGNATURE GROUP', margin, 28);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.text('Unit Inventory Report', margin, 45);

    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, pageW - margin, 35, { align: 'right' });

    const head = [[ 'Unit Code', 'Unit No', 'Project', 'Location', 'Block', 'Type', 'Floor', 'Facing', 'Corner', 'Garden', 'Area (sqft)', 'Status', 'Rate' ]];
    const body = sortedUnits.map(u => [
      u.unitCode || '',
      u.unitNo || '',
      u.project || '',
      u.location || '',
      u.block || '',
      u.unitType || '',
      u.floor || '',
      u.facing || '',
      u.corner || '',
      u.garden || '',
      u.area ? `${u.area.toLocaleString('en-IN')} (${u.areaBasis})` : '—',
      u.status || '',
      formatRate(u)
    ]);

    doc.autoTable({
      head: head,
      body: body,
      startY: 90,
      theme: 'grid',
      styles: { fontSize: 8, textColor: INK },
      headStyles: { fillColor: INK, textColor: 255 },
      alternateRowStyles: { fillColor: PAPER_ROW },
      columnStyles: {
        10: { halign: 'right' },
        11: { halign: 'center' },
        12: { halign: 'right' }
      },
      didParseCell: (cellData) => {
        if (cellData.section === 'body' && cellData.column.index === 11) {
          const v = String(cellData.cell.raw || '').toLowerCase();
          if (v === 'available') cellData.cell.styles.textColor = GREEN;
          else if (v === 'sold') cellData.cell.styles.textColor = RED;
          else if (v === 'hold') cellData.cell.styles.textColor = AMBER;
        }
      }
    });

    doc.save(`Signature-Group-Inventory-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (loading) {
    return (
      <div className="inv-body inv-loading">
        <div className="inv-spin"></div>
        <p style={{ marginTop: '16px', color: 'var(--ink-soft)' }}>Reading MASTER DATABASE and PROJECT MASTER…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="inv-body" style={{ padding: '40px' }}>
        <div style={{ background: '#F5E7E4', border: '1px solid var(--red)', padding: '20px', borderRadius: '4px' }}>
          <h3 style={{ color: 'var(--red)', margin: '0 0 10px' }}>Could not load data.</h3>
          <p>{error}</p>
          <button className="inv-refresh" onClick={loadData}>Retry</button>
        </div>
      </div>
    );
  }

  // Get project facts for current selection
  const pm = data.projectMaster[selectedProject] || {};
  const pd = data.projectDetails[selectedProject] || {};

  let facts = [];
  const isHeritage = /heritage/i.test(selectedProject);
  if (pm.projectType) facts.push({ label: 'Project type', value: pm.projectType });
  if (pm.resCom) facts.push({ label: 'Residential / Commercial', value: pm.resCom });
  if (pm.landArea) facts.push({ label: 'Total land area', value: pm.landArea });

  if (isHeritage) {
    const plotSize = getPlotSizeForProject(selectedProject);
    if (plotSize) facts.push({ label: 'Plot size', value: plotSize });
  } else if (pm.builtup) {
    facts.push({ label: 'Total built-up area', value: pm.builtup });
  }

  if (pm.flats) facts.push({ label: 'Total flats', value: pm.flats });
  if (pm.shops) facts.push({ label: 'Total shops', value: pm.shops });
  if (pm.plots) facts.push({ label: 'Total plots', value: pm.plots });
  if (pm.possession) facts.push({ label: 'Possession', value: pm.possession });
  if (!facts.length && pd.quickFacts) facts = pd.quickFacts;

  const projectPickerList = Object.keys(data.projectMaster).length > 0 
    ? Object.keys(data.projectMaster) 
    : [...new Set(data.units.map(u => u.project).filter(Boolean))];

  return (
    <div className="inv-body">
      <div className="inv-wrap">
        {/* Topbar */}
        <div className="inv-topbar">
          <div>
            <h1>Signature Group</h1>
            <div className="sub">{data.units.length} units across {projectPickerList.length} projects</div>
          </div>
          <div className="inv-topbar-right">
            <div className="inv-refreshed">
              <span>Updated {data.generatedAt ? new Date(data.generatedAt).toLocaleString() : '—'}</span>
            </div>
            <button className="inv-refresh" onClick={loadData}>Refresh</button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="inv-nav">
          <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>Overview</button>
          <button className={activeTab === 'projectInfo' ? 'active' : ''} onClick={() => setActiveTab('projectInfo')}>Project Info</button>
        </div>

        {/* Tab 1: Overview Dashboard */}
        {activeTab === 'overview' && (
          <div>
            {/* KPIs */}
            <div className="inv-kpis">
              <div className="inv-kpi">
                <div className="label">Total units</div>
                <div className="value">{filteredUnits.length.toLocaleString('en-IN')}</div>
              </div>
              <div className="inv-kpi accent-green">
                <div className="label">Available</div>
                <div className="value">{filteredUnits.filter(u => u.status === 'Available').length.toLocaleString('en-IN')}</div>
              </div>
              <div className="inv-kpi accent-red">
                <div className="label">Sold</div>
                <div className="value">{filteredUnits.filter(u => u.status === 'Sold').length.toLocaleString('en-IN')}</div>
              </div>
              <div className="inv-kpi accent-amber">
                <div className="label">Hold</div>
                <div className="value">{filteredUnits.filter(u => u.status === 'Hold').length.toLocaleString('en-IN')}</div>
              </div>
              <div className="inv-kpi">
                <div className="label">Projects</div>
                <div className="value">{[...new Set(filteredUnits.map(u => u.project))].length}</div>
              </div>
            </div>

            <div className="inv-section-head"><h2>Unit inventory</h2></div>

            {/* Filter controls */}
            <div className="inv-filters">
              <select name="project" value={filters.project} onChange={handleFilterChange}>
                <option value="">All projects</option>
                {uniqueValues('project').map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select name="status" value={filters.status} onChange={handleFilterChange}>
                <option value="">All statuses</option>
                {uniqueValues('status').map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select name="unitType" value={filters.unitType} onChange={handleFilterChange}>
                <option value="">All unit types</option>
                {uniqueValues('unitType').map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <select name="facing" value={filters.facing} onChange={handleFilterChange}>
                <option value="">All facings</option>
                {uniqueValues('facing').map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select name="corner" value={filters.corner} onChange={handleFilterChange}>
                <option value="">Corner: All</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
              <select name="garden" value={filters.garden} onChange={handleFilterChange}>
                <option value="">Garden: All</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
              <input 
                type="text" 
                name="search" 
                value={filters.search} 
                onChange={handleFilterChange} 
                placeholder="Search unit code, unit no, block, location…"
              />
              <button className="clear" onClick={clearFilters}>Clear filters</button>
              <button className="btn-pdf" onClick={downloadPDF}>Download PDF</button>
            </div>

            <div style={{ fontSize: '12.5px', color: 'var(--ink-soft)', margin: '10px 2px 0' }}>
              {sortedUnits.length} of {data.units.length} units shown
            </div>

            {/* Table */}
            <div className="inv-table-scroll">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('unitCode')}>Unit code</th>
                    <th onClick={() => handleSort('unitNo')}>Unit no</th>
                    <th onClick={() => handleSort('project')}>Project</th>
                    <th onClick={() => handleSort('location')}>Location</th>
                    {isBlockColVisible && <th onClick={() => handleSort('block')}>Block</th>}
                    <th onClick={() => handleSort('unitType')}>Type</th>
                    {isFloorColVisible && <th onClick={() => handleSort('floor')}>Floor</th>}
                    <th onClick={() => handleSort('facing')}>Facing</th>
                    <th onClick={() => handleSort('corner')}>Corner</th>
                    <th onClick={() => handleSort('garden')}>Garden</th>
                    <th onClick={() => handleSort('area')} className="num">Area (sq.ft)</th>
                    <th>Status</th>
                    <th onClick={() => handleSort('rate')} className="num">Rate (₹/sq.ft)</th>
                    <th>Map</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUnits.map((u, i) => (
                    <tr key={i} onClick={() => setModalUnit(u)}>
                      <td>{u.unitCode}</td>
                      <td>{u.unitNo}</td>
                      <td>{u.project}</td>
                      <td>{u.location}</td>
                      {isBlockColVisible && <td>{u.block}</td>}
                      <td>{u.unitType}</td>
                      {isFloorColVisible && <td>{u.floor}</td>}
                      <td>{u.facing}</td>
                      <td style={{ color: u.corner?.toLowerCase() === 'yes' ? 'var(--green)' : 'inherit', fontWeight: u.corner?.toLowerCase() === 'yes' ? '600' : 'normal' }}>
                        {u.corner}
                      </td>
                      <td style={{ color: u.garden?.toLowerCase() === 'yes' ? 'var(--green)' : 'inherit', fontWeight: u.garden?.toLowerCase() === 'yes' ? '600' : 'normal' }}>
                        {u.garden}
                      </td>
                      <td className="num">{u.area?.toLocaleString('en-IN')} {u.areaBasis && <small style={{ color: 'var(--ink-soft)' }}>({u.areaBasis})</small>}</td>
                      <td>
                        <span className={`inv-badge inv-badge-${u.status.toLowerCase()}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="num">{formatRate(u)}</td>
                      <td>
                        {u.mapsLink ? (
                          <a href={u.mapsLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brick)', textDecoration: 'none', fontWeight: '600' }} onClick={e => e.stopPropagation()}>
                            Map ↗
                          </a>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Project Summary Cards */}
            <div className="inv-section-head"><h2>Projects</h2></div>
            <div className="inv-projects">
              {projectPickerList.map(projName => {
                const info = data.projectMaster[projName] || {};
                const projUnits = data.units.filter(u => u.project === projName);
                return (
                  <div className="inv-project-card" key={projName}>
                    <h3>{projName}</h3>
                    <div className="loc">
                      {info.location || projUnits[0]?.location || ''}
                    </div>
                    {info.projectType && <div className="row"><span style={{ color: 'var(--ink-soft)' }}>Type</span><strong>{info.projectType}</strong></div>}
                    {info.landArea && <div className="row"><span style={{ color: 'var(--ink-soft)' }}>Land area</span><strong>{info.landArea}</strong></div>}
                    <div className="row"><span style={{ color: 'var(--ink-soft)' }}>Total units</span><strong>{projUnits.length}</strong></div>
                    {info.possession && <div className="row"><span style={{ color: 'var(--ink-soft)' }}>Possession</span><strong>{info.possession}</strong></div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Project Info View */}
        {activeTab === 'projectInfo' && (
          <div>
            <div className="inv-project-picker">
              {projectPickerList.map(p => (
                <button 
                  key={p} 
                  className={selectedProject === p ? 'active' : ''}
                  onClick={() => setSelectedProject(p)}
                >
                  {p}
                </button>
              ))}
            </div>

            {selectedProject ? (
              <div>
                <div className="inv-info-header">
                  <h2>{selectedProject}</h2>
                  <div className="loc">
                    {pm.location || data.units.find(u => u.project === selectedProject)?.location || ''}
                  </div>
                </div>

                {/* Quick Facts Grid */}
                {facts.length > 0 && (
                  <div className="inv-quick-facts">
                    {facts.map((fact, index) => (
                      <div className="fact" key={index}>
                        <div className="k">{fact.label}</div>
                        <div className="v">{fact.value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Amenities */}
                <div className="inv-section-head"><h2>Amenities</h2></div>
                {pd.amenities && pd.amenities.length > 0 ? (
                  <div className="inv-amenity-grid">
                    {pd.amenities.map((amenity, idx) => (
                      <div key={idx} className="inv-amenity-chip">
                        {amenity}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'var(--ink-soft)', padding: '20px 0' }}>No amenities listed for this project yet.</div>
                )}

                {/* Landmark Distances */}
                <div className="inv-section-head"><h2>Nearby landmarks</h2></div>
                {pd.landmarks && pd.landmarks.length > 0 ? (
                  <table className="inv-landmarks-table">
                    <thead>
                      <tr>
                        <th>Landmark</th>
                        <th style={{ textAlign: 'right' }}>Approx. distance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pd.landmarks.map((l, index) => (
                        <tr key={index}>
                          <td>{l.name}</td>
                          <td className="num">{l.distanceKm !== null ? `${l.distanceKm} km` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ color: 'var(--ink-soft)', padding: '20px 0' }}>No landmark distances listed for this project yet.</div>
                )}

                {/* Location Advantages / FAB */}
                <div className="inv-section-head">
                  <h2>Location advantages</h2>
                  <div style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>Feature → Advantage → Benefit, as documented for this project</div>
                </div>
                
                {pd.fab && pd.fab.length > 0 ? (
                  <div className="inv-fab-list">
                    {pd.fab.map((f, index) => (
                      <div key={index} className={`inv-fab-card ${f.top3 ? 'top3' : ''}`}>
                        <div className="fab-top">
                          <h4>{f.feature}</h4>
                          {f.top3 && <span className="inv-badge-top3">Top 3</span>}
                        </div>
                        {f.advantage && <div className="advantage">{f.advantage}</div>}
                        {f.benefit && <div className="benefit">{f.benefit}</div>}
                        <div className="meta">
                          {f.proof && <span><strong>Specifics:</strong> {f.proof}</span>}
                          {f.situations && <span><strong>Best for:</strong> {f.situations}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'var(--ink-soft)', padding: '20px 0' }}>No location advantages documented for this project yet.</div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--ink-soft)' }}>No project selected</div>
            )}
          </div>
        )}
      </div>

      {/* Unit Detail Dialog Modal */}
      {modalUnit && (
        <div className="inv-modal-overlay" onClick={() => setModalUnit(null)}>
          <div className="inv-modal-box" onClick={e => e.stopPropagation()}>
            <div className="inv-modal-head">
              <h3 style={{ margin: 0, fontFamily: "'Source Serif 4', Georgia, serif" }}>{modalUnit.unitCode || 'Unit Details'}</h3>
              <button className="inv-modal-close" onClick={() => setModalUnit(null)}>&times;</button>
            </div>
            <div style={{ padding: '14px 20px 20px' }}>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--paper-deep)' }}>
                <span style={{ color: 'var(--ink-soft)' }}>Project Name</span><strong>{modalUnit.project}</strong>
              </div>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--paper-deep)' }}>
                <span style={{ color: 'var(--ink-soft)' }}>Unit Number</span><strong>{modalUnit.unitNo}</strong>
              </div>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--paper-deep)' }}>
                <span style={{ color: 'var(--ink-soft)' }}>Unit Type</span><strong>{modalUnit.unitType}</strong>
              </div>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--paper-deep)' }}>
                <span style={{ color: 'var(--ink-soft)' }}>Floor</span><strong>{modalUnit.floor || '—'}</strong>
              </div>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--paper-deep)' }}>
                <span style={{ color: 'var(--ink-soft)' }}>Facing</span><strong>{modalUnit.facing || '—'}</strong>
              </div>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--paper-deep)' }}>
                <span style={{ color: 'var(--ink-soft)' }}>Plot Area</span><strong>{modalUnit.plotArea ? `${modalUnit.plotArea.toLocaleString('en-IN')} sq.ft` : '—'}</strong>
              </div>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--paper-deep)' }}>
                <span style={{ color: 'var(--ink-soft)' }}>Status</span><strong>{modalUnit.status}</strong>
              </div>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--paper-deep)' }}>
                <span style={{ color: 'var(--ink-soft)' }}>Rate Reference</span><strong>{formatRate(modalUnit)}</strong>
              </div>
              {modalUnit.remarks && (
                <div style={{ marginTop: '14px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>Remarks</div>
                  <p style={{ margin: '4px 0', fontStyle: 'italic' }}>"{modalUnit.remarks}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}