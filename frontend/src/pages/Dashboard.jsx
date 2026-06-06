import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertCircle,
  Calendar,
  Flame,
  Thermometer,
  Activity,
  ArrowRight,
  Clock,
  Info,
  Layers3,
  Database,
  Download,
  Workflow,
  UserCheck,
  Zap,
  TrendingUp,
  Scale
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { documentApi } from '../services/api';

const HEAT_COLORS = [
  "#22d3ee", // Cyan
  "#818cf8", // Indigo
  "#fbbf24", // Amber
  "#34d399", // Emerald
  "#f87171", // Rose
  "#a78bfa", // Violet
  "#38bdf8", // Sky
  "#fb923c", // Orange
  "#2dd4bf", // Teal
  "#ec4899"  // Pink
];

// Custom Glassmorphic Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-2xl">
        <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1.5">{label}</p>
        {payload.map((p, idx) => (
          <div key={idx} className="flex items-center gap-2.5 text-xs font-semibold py-0.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color || p.stroke || p.fill }} />
            <span className="text-slate-300 font-medium">{p.name}:</span>
            <span style={{ color: p.color || p.stroke || p.fill }} className="font-mono">
              {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('ingest'); // 'ingest' or 'historical'

  // File upload states
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // States for active document analytics
  const [kpis, setKpis] = useState({ totalWeight: 0, totalQty: 0, cycleNo: 'N/A', furnace: 'N/A' });
  const [gradeData, setGradeData] = useState([]);
  const [scatterData, setScatterData] = useState([]);

  // Historical database analytics states
  const [historicalHeats, setHistoricalHeats] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Calculate and process metrics specifically for the currently extracted document (Tab 1)
  useEffect(() => {
    if (!result) {
      setKpis({ totalWeight: 0, totalQty: 0, cycleNo: 'N/A', furnace: 'N/A' });
      setGradeData([]);
      setScatterData([]);
      return;
    }

    const metadata = result.document_metadata || {};
    const mainTable = result.main_table_data || [];

    let weightSum = 0;
    let qtySum = 0;
    const grades = {};
    const scatter = [];

    mainTable.forEach((row, idx) => {
      const w = parseFloat(row.weight) || 0;
      const q = parseInt(row.qty) || 0;
      weightSum += w;
      qtySum += q;

      const grade = row.grade || 'Unknown';
      grades[grade] = (grades[grade] || 0) + w;

      scatter.push({
        id: `part-${idx}`,
        qty: q,
        weight: w,
        description: row.description || 'N/A',
        heatNo: row.heat_no || 'N/A',
        grade: row.grade || 'N/A'
      });
    });

    setKpis({
      totalWeight: Math.round(weightSum * 100) / 100,
      totalQty: qtySum,
      cycleNo: metadata.cycle_no || 'N/A',
      furnace: metadata.furnace || 'N/A'
    });

    const gradeChartData = Object.keys(grades).map(g => ({
      name: g,
      value: Math.round(grades[g] * 100) / 100
    }));
    setGradeData(gradeChartData);
    setScatterData(scatter);
  }, [result]);

  // Load and process historical multi-series heats from MongoDB (Tab 2)
  const fetchHistoricalData = async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const data = await documentApi.getAllDocuments();
      if (data && data.length > 0) {
        const cycles = data.map((doc, idx) => {
          const ext = doc.extracted_data || {};
          const meta = ext.document_metadata || {};
          const proc = ext.process_details || {};
          const table = ext.main_table_data || [];
          
          let cycleWeight = 0;
          let cycleQty = 0;
          table.forEach(r => {
            cycleWeight += parseFloat(r.weight) || 0;
            cycleQty += parseInt(r.qty) || 0;
          });

          return {
            taskId: doc.task_id,
            cycleNo: meta.cycle_no || `Cycle #${idx + 1}`,
            date: meta.cycle_date || 'N/A',
            furnace: meta.furnace || 'N/A',
            title: meta.document_title || 'Heat Treatment Log Sheet',
            details: meta.cycle_details || 'N/A',
            totalWeight: Math.round(cycleWeight * 100) / 100,
            totalQty: cycleQty,
            itemCount: table.length,
            process: proc
          };
        });

        setHistoricalHeats(cycles);
      } else {
        setHistoricalHeats([]);
      }
    } catch (err) {
      console.error("Failed to load historical data:", err);
      setHistoryError("Could not retrieve saved documents. Make sure the database service is online.");
    } finally {
      setHistoryLoading(false);
    }
  };

  // Re-fetch historical database records when switching to Tab 2
  useEffect(() => {
    if (activeTab === 'historical') {
      fetchHistoricalData();
    }
  }, [activeTab]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await documentApi.exportDocuments();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'heat_treatment_export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export Excel file:", err);
      alert("Failed to export Excel file: " + (err.message || "Unknown error"));
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await documentApi.uploadDocument(file);
      if (data.error) {
        throw new Error(data.error);
      }
      setResult(data.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Failed to process document.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-[1600px] mx-auto z-10 relative">
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          height: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0f172a;
          border-radius: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 6px;
          border: 2px solid #0f172a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
        @keyframes laser-scan {
          0%, 100% { top: 0%; opacity: 0.8; }
          50% { top: 100%; opacity: 0.3; }
        }
        .animate-laser {
          animation: laser-scan 3s ease-in-out infinite;
        }
      `}} />

      {/* Header & Page Title */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Heat Treatment Intelligence Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Standard UA/F/FET/01 log sheet digitization, cycle timeline visualization, and material grade analytics.
          </p>
        </div>

        {/* Connection status indicator */}
        <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-900/60 border border-slate-800/80 rounded-xl shadow-inner">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_8px_#22d3ee] animate-pulse" />
          <span className="text-xs text-slate-300 font-semibold flex items-center gap-1">
            <Database size={13} className="text-cyan-400" />
            Secure MongoDB Storage
          </span>
        </div>
      </div>

      {/* Sleek Tab Switcher Capsules */}
      <div className="flex bg-slate-950/60 p-1.5 border border-slate-800 rounded-2xl w-full sm:w-[480px] shadow-lg shadow-slate-950/40">
        <button
          onClick={() => setActiveTab('ingest')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-300 ${activeTab === 'ingest'
            ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 shadow-md font-extrabold font-sans'
            : 'text-slate-400 hover:text-slate-200'
            }`}
        >
          <Layers3 size={15} />
          <span>Log Sheet Ingestion</span>
        </button>
        <button
          onClick={() => setActiveTab('historical')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-300 ${activeTab === 'historical'
            ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 shadow-md font-extrabold font-sans'
            : 'text-slate-400 hover:text-slate-200'
            }`}
        >
          <Clock size={15} />
          <span>Historical Cycles</span>
        </button>
      </div>

      {/* TAB 1: Ingestion & Current Sheet Analytics */}
      {activeTab === 'ingest' && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Upload Panel */}
            <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Layers3 className="text-cyan-400" size={22} />
                  <h2 className="text-lg font-bold text-slate-100">Intelligent Log Sheet Scanner</h2>
                </div>
                <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                  Upload a handwritten or printed <strong>Heat Treatment Log Sheet (PDF/JPG/PNG)</strong>. The vision processor will read the table columns, extract heat codes, and map the process temperatures.
                </p>

                {/* Drag & Drop Zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all duration-300 ${dragActive ? 'border-cyan-400 bg-cyan-950/20 scale-[0.99]' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/20'
                    }`}
                >
                  <input
                    id="file-upload"
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="p-3.5 bg-slate-900 rounded-xl text-slate-400 mb-4 border border-slate-800 shadow-md">
                    <UploadCloud size={28} className="text-cyan-400" />
                  </div>
                  <p className="text-slate-200 text-xs font-semibold mb-1">
                    {file ? file.name : "Drag & Drop files here, or Click to Browse"}
                  </p>
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                    Supports PDF, JPG, JPEG, PNG (Max 15MB)
                  </p>

                  {file && (
                    <div className="mt-4 px-3 py-1 rounded-lg bg-cyan-950/30 border border-cyan-800/30 flex items-center gap-2 text-[10px] text-cyan-400 font-mono">
                      <FileText size={12} />
                      <span>{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end">
                <button
                  onClick={handleUpload}
                  disabled={loading || !file}
                  className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${loading || !file
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 hover:scale-[1.02] shadow-cyan-500/10'
                    }`}
                >
                  {loading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Extracting Heat Log...</span>
                    </>
                  ) : (
                    <>
                      <span>Scan & Save Cycle</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Telemetry Status Panel */}
            <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between relative overflow-hidden">
              {loading && (
                <div className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-laser z-20 pointer-events-none" />
              )}

              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Activity className="text-indigo-400" size={22} />
                  <h2 className="text-lg font-bold text-slate-100">Vision System Telemetry</h2>
                </div>

                {loading ? (
                  <div className="py-10 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 rounded-full border-4 border-slate-800 border-t-cyan-400 animate-spin" />
                      <div className="absolute inset-2 rounded-full border-4 border-slate-800 border-t-indigo-400 animate-spin" style={{ animationDirection: 'reverse' }} />
                    </div>
                    <div>
                      <h3 className="text-slate-200 text-xs font-bold uppercase tracking-wider">OCR Pipeline Parsing</h3>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-[220px] leading-relaxed">
                        Detecting printed tables, interpreting furnace logs, and matching signature zones.
                      </p>
                    </div>
                  </div>
                ) : result ? (
                  <div className="space-y-4 py-1">
                    <div className="p-4 rounded-xl bg-slate-950/85 border border-slate-800 space-y-3 shadow-inner">
                      <div className="flex items-center gap-2 text-slate-200 text-xs font-bold border-b border-slate-800 pb-2 uppercase tracking-wider">
                        <CheckCircle className="text-emerald-400 shrink-0" size={14} />
                        <span>Inference Success</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">Main Log Rows</span>
                          <strong className="text-slate-200 text-base font-bold font-mono">
                            {result.main_table_data?.length || 0} rows
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">Cycle Code</span>
                          <strong className="text-cyan-400 text-xs font-bold truncate block font-mono">
                            {result.document_metadata?.cycle_no || "N/A"}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 text-[11px] text-slate-400 leading-relaxed font-semibold">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1.5">
                        <Info size={12} />
                        <span>Record Saved Successfully</span>
                      </div>
                      <p>
                        Your Heat Treatment record has been processed and saved. The charts and summaries below are fully updated.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-10 flex flex-col items-center justify-center text-center text-slate-500">
                    <Database size={36} className="stroke-[1.5] text-slate-700 mb-3" />
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scanner Idle</p>
                    <p className="text-[11px] text-slate-600 max-w-[200px] mt-1.5 leading-relaxed">
                      Upload a UA/F/FET/01 sheet to trigger structure OCR and extract cycle metrics.
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 p-4 bg-rose-950/20 border border-rose-900/30 text-rose-300 rounded-xl flex gap-3 text-xs">
                  <AlertCircle size={16} className="shrink-0 text-rose-400" />
                  <div>
                    <strong className="font-bold uppercase tracking-wider block mb-0.5">Telemetry Error</strong>
                    <span className="font-semibold text-rose-400">{error}</span>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Current Ingested Analytics Block */}
          {result && (
            <div className="space-y-8 animate-fade-in">

              {/* Premium Metadata Cards Layer */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
                
                {/* Card 1: Cycle No */}
                <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Zap size={72} className="text-slate-100" />
                  </div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">Cycle Code / ID</span>
                  <strong className="text-cyan-400 text-2xl font-black block font-mono mt-1">
                    {kpis.cycle_no}
                  </strong>
                  <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                    Date: {result.document_metadata?.cycle_date || 'N/A'}
                  </span>
                </div>

                {/* Card 2: Total Items */}
                <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Layers3 size={72} className="text-slate-100" />
                  </div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">Items Treated</span>
                  <strong className="text-slate-150 text-2xl font-black block mt-1">
                    {kpis.totalQty} <span className="text-xs text-slate-500">pcs</span>
                  </strong>
                  <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                    {result.main_table_data?.length || 0} batches listed
                  </span>
                </div>

                {/* Card 3: Total Weight */}
                <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Scale size={72} className="text-slate-100" />
                  </div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">Total Batch Weight</span>
                  <strong className="text-amber-400 text-2xl font-black block font-mono mt-1">
                    {kpis.totalWeight.toLocaleString()} <span className="text-xs text-slate-500">kg</span>
                  </strong>
                  <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                    {gradeData.length} unique steel grades
                  </span>
                </div>

                {/* Card 4: Furnace Used */}
                <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Flame size={72} className="text-slate-100" />
                  </div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">Furnace & Max Load</span>
                  <strong className="text-purple-400 text-sm font-extrabold truncate block mt-1" title={kpis.furnace}>
                    {kpis.furnace}
                  </strong>
                  <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                    Thick: {result.document_metadata?.max_thick_loaded || 'N/A'}
                  </span>
                </div>

              </div>

              {/* Heat Treatment Process Timeline */}
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-indigo-950 text-indigo-400 rounded-xl border border-indigo-800/40">
                    <Workflow size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">Cycle Log Timeline & Quenching Metrics</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Physical furnace event timeline and temperatures extracted from H/T Details.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative">
                  
                  {/* Timeline Node 1 */}
                  <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl relative">
                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-[9px] uppercase font-extrabold text-cyan-400 tracking-wider">Milestone 01</span>
                    <h4 className="text-xs font-bold text-slate-350 mt-1">F/C On Time (Load)</h4>
                    <p className="text-lg font-black text-slate-100 font-mono mt-2">
                      {result.process_details?.fc_on_time || 'N/A'}
                    </p>
                  </div>

                  {/* Timeline Node 2 */}
                  <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl relative">
                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-[9px] uppercase font-extrabold text-amber-400 tracking-wider">Milestone 02</span>
                    <h4 className="text-xs font-bold text-slate-350 mt-1">Temp Reached</h4>
                    <p className="text-lg font-black text-slate-100 font-mono mt-2">
                      {result.process_details?.temp_reach_at || 'N/A'}
                    </p>
                  </div>

                  {/* Timeline Node 3 */}
                  <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl relative">
                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-[9px] uppercase font-extrabold text-red-500 tracking-wider">Milestone 03</span>
                    <h4 className="text-xs font-bold text-slate-350 mt-1">F/C OFF Time</h4>
                    <p className="text-lg font-black text-slate-100 font-mono mt-2">
                      {result.process_details?.fc_off_time || 'N/A'}
                    </p>
                  </div>

                  {/* Timeline Node 4 */}
                  <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl relative">
                    <span className="text-[9px] uppercase font-extrabold text-indigo-400 tracking-wider">Quench Stage</span>
                    <h4 className="text-xs font-bold text-slate-350 mt-1">Quenching & Cooling</h4>
                    <div className="mt-2 text-slate-300 text-xs font-semibold space-y-1">
                      <div>Quench Duration: <strong className="text-indigo-400 font-mono">{result.process_details?.quenching_sec || '-'}</strong></div>
                      <div className="flex gap-2">
                        <span>Water Temp:</span>
                        <strong className="text-emerald-400 font-mono">{result.process_details?.water_temp_before || '-'}</strong>
                        <span className="text-slate-500">→</span>
                        <strong className="text-blue-400 font-mono">{result.process_details?.water_temp_after || '-'}</strong>
                      </div>
                    </div>
                  </div>

                </div>

                {result.document_metadata?.cycle_details && (
                  <div className="mt-5 p-4 bg-slate-950/40 border border-slate-850 rounded-xl text-xs text-slate-400 leading-relaxed font-semibold">
                    <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider block mb-1">Cycle Instructions Details</span>
                    <p className="italic">"{result.document_metadata.cycle_details}"</p>
                  </div>
                )}
              </div>

              {/* Main Log Sheet Table */}
              <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden mt-8 animate-fade-in">
                <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      <Scale size={20} className="text-cyan-400" />
                      <span>Treated Castings Main Log Table ({result.main_table_data?.length || 0} batches)</span>
                    </h3>
                    <p className="text-slate-400 text-xs mt-1 font-semibold">
                      Extracted table rows representing casting weights, quantities, grades and sales references.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="min-w-full divide-y divide-slate-800 text-xs font-semibold">
                    <thead className="bg-slate-950/60 text-slate-500 uppercase font-bold text-[9px] tracking-wider sticky top-0">
                      <tr>
                        <th scope="col" className="px-4 py-4 text-center border-r border-slate-900/40 w-12">#</th>
                        <th scope="col" className="px-4 py-4 text-left border-r border-slate-900/40 min-w-[95px]">Pour Date</th>
                        <th scope="col" className="px-4 py-4 text-left border-r border-slate-900/40 min-w-[95px]">Heat</th>
                        <th scope="col" className="px-4 py-4 text-left border-r border-slate-900/40 min-w-[100px]">Grade</th>
                        <th scope="col" className="px-4 py-4 text-left border-r border-slate-900/40 min-w-[145px]">Sale order / Item</th>
                        <th scope="col" className="px-4 py-4 text-left border-r border-slate-900/40 min-w-[185px]">Drawing No</th>
                        <th scope="col" className="px-4 py-4 text-left border-r border-slate-900/40 min-w-[130px]">Part No</th>
                        <th scope="col" className="px-4 py-4 text-left border-r border-slate-900/40 min-w-[280px]">Description</th>
                        <th scope="col" className="px-4 py-4 text-center border-r border-slate-900/40 min-w-[65px]">Qty</th>
                        <th scope="col" className="px-4 py-4 text-right min-w-[100px]">Weight (kg)</th>
                      </tr>
                    </thead>

                    <tbody className="bg-slate-950/10 divide-y divide-slate-800/40 text-slate-350">
                      {result.main_table_data && result.main_table_data.length > 0 ? (
                        result.main_table_data.map((row, index) => (
                          <tr key={index} className="hover:bg-slate-900/40 transition-colors">
                            <td className="px-4 py-3 text-slate-550 text-center font-bold border-r border-slate-900/40">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap border-r border-slate-900/40 text-slate-400">
                              {row.pour_date || <span className="text-slate-700">-</span>}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap border-r border-slate-900/40 font-bold text-cyan-400 font-mono">
                              {row.heat_no || <span className="text-slate-700">-</span>}
                            </td>
                            <td className="px-4 py-3 border-r border-slate-900/40">
                              {row.grade ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-800 text-indigo-400">
                                  {row.grade}
                                </span>
                              ) : (
                                <span className="text-slate-700">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 border-r border-slate-900/40 font-mono text-slate-300">
                              {row.sale_order || <span className="text-slate-700">-</span>}
                            </td>
                            <td className="px-4 py-3 border-r border-slate-900/40 text-slate-400 text-xs font-mono truncate max-w-[180px]" title={row.drawing_no}>
                              {row.drawing_no || <span className="text-slate-700">-</span>}
                            </td>
                            <td className="px-4 py-3 border-r border-slate-900/40 text-slate-400 text-xs font-mono">
                              {row.part_no || <span className="text-slate-700">-</span>}
                            </td>
                            <td className="px-4 py-3 border-r border-slate-900/40 text-slate-200 font-medium truncate max-w-[280px]" title={row.description}>
                              {row.description || <span className="text-slate-700">-</span>}
                            </td>
                            <td className="px-4 py-3 text-center border-r border-slate-900/40 text-slate-200 font-mono">
                              {row.qty || <span className="text-slate-700">-</span>}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-amber-400 font-bold">
                              {row.weight ? parseFloat(row.weight).toLocaleString(undefined, {minimumFractionDigits: 3}) : <span className="text-slate-700">-</span>}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="10" className="px-4 py-8 text-center text-slate-650 font-medium">
                            No table data available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-950/60 p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                  <span>Batch Rows: {result.main_table_data?.length || 0}</span>
                  <span>Tonnage: <strong className="text-cyan-400 font-bold">{(kpis.totalWeight / 1000).toFixed(3)} metric tons</strong></span>
                </div>
              </div>

              {/* Grid 2 Column: Pattern Specifications & Signatures */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                
                {/* Pattern Specifications */}
                <div className="lg:col-span-2 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
                      <Workflow size={16} className="text-cyan-400" />
                      <h3 className="text-base font-bold text-slate-250">Pattern Thickness Specifications</h3>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="min-w-full divide-y divide-slate-800 text-xs font-semibold">
                        <thead className="bg-slate-950/60 text-slate-500 uppercase font-bold text-[9px] tracking-wider">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left">Pattern Code</th>
                            <th scope="col" className="px-4 py-3 text-left font-medium">Item Name</th>
                            <th scope="col" className="px-4 py-3 text-left font-medium">Thickness Limits / Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850/40 text-slate-350">
                          {result.pattern_data && result.pattern_data.length > 0 ? (
                            result.pattern_data.map((pat, idx) => (
                              <tr key={idx} className="hover:bg-slate-950/20">
                                <td className="px-4 py-2.5 font-bold font-mono text-indigo-400">{pat.pattern_code || '-'}</td>
                                <td className="px-4 py-2.5 text-slate-200">{pat.item_name || '-'}</td>
                                <td className="px-4 py-2.5 font-mono text-amber-500 text-[11px] font-bold">{pat.remarks || '-'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="3" className="px-4 py-6 text-center text-slate-600">No pattern specifications found.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Signatures verification card */}
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
                      <UserCheck size={16} className="text-indigo-400" />
                      <h3 className="text-base font-bold text-slate-250">Verification & Signatures</h3>
                    </div>

                    <div className="space-y-4 py-2">
                      <div className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                        <span className="text-xs text-slate-400 font-semibold">Verified Sign Check</span>
                        {result.signatures?.verified_sign ? (
                          <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-[10px] uppercase font-extrabold tracking-wider">
                            Signed
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-500 rounded-lg text-[10px] uppercase font-extrabold tracking-wider">
                            Unsigned
                          </span>
                        )}
                      </div>
                      
                      {result.signatures?.verified_sign && (
                        <div className="p-3 bg-indigo-950/10 border border-indigo-900/20 rounded-xl text-center text-indigo-300 font-mono text-xs italic font-bold">
                          Signed as: {result.signatures.verified_sign}
                        </div>
                      )}

                      <div className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                        <span className="text-xs text-slate-400 font-semibold">Lab in Charge</span>
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-extrabold tracking-wider ${
                          result.signatures?.lab_in_charge === 'true' || result.signatures?.lab_in_charge === true
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                            : 'bg-slate-800 border border-slate-700 text-slate-500'
                        }`}>
                          {result.signatures?.lab_in_charge === 'true' || result.signatures?.lab_in_charge === true ? 'Verified' : 'Pending'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                        <span className="text-xs text-slate-400 font-semibold">QA in Charge</span>
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-extrabold tracking-wider ${
                          result.signatures?.qa_in_charge === 'true' || result.signatures?.qa_in_charge === true
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                            : 'bg-slate-800 border border-slate-700 text-slate-500'
                        }`}>
                          {result.signatures?.qa_in_charge === 'true' || result.signatures?.qa_in_charge === true ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Interactive Analytics Dashboards Section */}
              <div className="space-y-8 pt-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <TrendingUp className="text-cyan-400" size={22} />
                    <h2 className="text-xl font-bold text-slate-100">Batch Yield Dashboards</h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Chart 1: Weight vs Qty (Scatter Plot) */}
                  <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-4 border-b border-slate-855 pb-2">
                        <h3 className="text-base font-bold text-slate-200">Casting Weight vs Quantity Correlation</h3>
                        <span className="ml-auto text-slate-500 text-xs font-bold uppercase tracking-wider">Weight Analysis</span>
                      </div>

                      <div className="h-[280px] w-full mt-3 relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis
                              type="number"
                              dataKey="qty"
                              name="Quantity"
                              unit=" pcs"
                              stroke="#475569"
                              tick={{ fontSize: 10, fill: '#64748b' }}
                              domain={[0, 'auto']}
                            />
                            <YAxis
                              type="number"
                              dataKey="weight"
                              name="Weight"
                              unit=" kg"
                              stroke="#475569"
                              tick={{ fontSize: 10, fill: '#64748b' }}
                              domain={[0, 'auto']}
                            />
                            <ZAxis type="number" range={[65, 65]} />
                            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#334155' }} />
                            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                            <Scatter name="Batch Castings" data={scatterData} fill="#22d3ee" shape="circle" />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="mt-4 p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl flex gap-2 text-[11px] text-slate-400 leading-relaxed font-semibold">
                      <Info size={14} className="text-cyan-400 shrink-0 mt-0.5" />
                      <p>
                        <strong className="text-cyan-300">Observation:</strong> Plots item weight against item quantity. Higher weight items cluster at lower quantities, typical for heavy industrial casting runs.
                      </p>
                    </div>
                  </div>

                  {/* Chart 2: Material Weight by Grade (Bar Chart) */}
                  <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-4 border-b border-slate-855 pb-2">
                        <h3 className="text-base font-bold text-slate-200">Processed Weight by Material Grade</h3>
                        <span className="ml-auto text-slate-500 text-xs font-bold uppercase tracking-wider">Metallurgical Breakdown</span>
                      </div>

                      <div className="h-[280px] w-full mt-3 relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={gradeData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis
                              dataKey="name"
                              stroke="#475569"
                              tick={{ fontSize: 10, fill: '#64748b' }}
                            />
                            <YAxis
                              stroke="#475569"
                              tick={{ fontSize: 10, fill: '#64748b' }}
                              unit=" kg"
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                            <Bar dataKey="value" name="Total Weight (kg)" radius={[4, 4, 0, 0]}>
                              {gradeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={HEAT_COLORS[index % HEAT_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="mt-4 p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl flex gap-2 text-[11px] text-slate-400 leading-relaxed font-semibold">
                      <Info size={14} className="text-amber-400 shrink-0 mt-0.5" />
                      <p>
                        <strong className="text-amber-300">Observation:</strong> Distributes tonnage metrics across steel grades. CA6NM is currently dominant in today's heat recipes, followed by FP alloy castings.
                      </p>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* TAB 2: Historical Cycles */}
      {activeTab === 'historical' && (
        <div className="space-y-8 animate-fade-in">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <Clock className="text-cyan-400" size={22} />
              <h2 className="text-xl font-bold text-slate-100">Saved Cycle Database</h2>
            </div>
            <div className="flex items-center gap-3.5">
              <button
                onClick={handleExport}
                disabled={exporting}
                className={`px-4 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 shadow-lg ${exporting
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 hover:scale-[1.03] shadow-emerald-500/10'
                  }`}
              >
                {exporting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Exporting Excel...</span>
                  </>
                ) : (
                  <>
                    <Download size={14} className="stroke-[2.5]" />
                    <span>Export Excel</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {historyLoading ? (
            <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-cyan-400 animate-spin" />
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Retrieving historical cycles...</p>
            </div>
          ) : historyError ? (
            <div className="p-6 bg-rose-950/20 border border-rose-900/30 rounded-2xl flex gap-3 text-sm text-rose-450">
              <AlertCircle size={20} className="shrink-0 text-rose-400" />
              <div>
                <strong className="font-bold uppercase tracking-wider block mb-1">Failed to Load Records</strong>
                <p className="font-semibold text-xs leading-relaxed">{historyError}</p>
                <button
                  onClick={fetchHistoricalData}
                  className="mt-3 px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold uppercase tracking-wider text-[10px] rounded-lg border border-rose-500/30"
                >
                  Retry Query
                </button>
              </div>
            </div>
          ) : historicalHeats.length === 0 ? (
            <div className="py-20 text-center bg-slate-900/40 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center">
              <Database size={44} className="text-slate-700 mb-4" />
              <h3 className="text-slate-200 text-sm font-bold uppercase tracking-wider">Historical Database is Empty</h3>
              <p className="text-slate-500 text-xs mt-2 max-w-[280px] leading-relaxed font-semibold">
                No processed Heat Treatment records were found in the database. Scan and save a log sheet first!
              </p>
            </div>
          ) : (
            <div className="space-y-8 animate-fade-in">
              
              {/* Telemetry Breakdown Details */}
              <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-slate-800">
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Database size={18} className="text-cyan-400" />
                    <span>Digitized Cycle Log History</span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-1 font-semibold">
                    Overall metrics for all casting runs saved in the system.
                  </p>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="min-w-full divide-y divide-slate-800 text-xs font-semibold">
                    <thead className="bg-slate-950/60 text-slate-500 uppercase font-bold text-[9px] tracking-wider">
                      <tr>
                        <th scope="col" className="px-6 py-4 text-left">Cycle ID</th>
                        <th scope="col" className="px-6 py-4 text-left">Date</th>
                        <th scope="col" className="px-6 py-4 text-left">Furnace</th>
                        <th scope="col" className="px-6 py-4 text-center">Batches Listed</th>
                        <th scope="col" className="px-6 py-4 text-right">Avg Item Qty</th>
                        <th scope="col" className="px-6 py-4 text-right font-bold">Total Weight (kg)</th>
                        <th scope="col" className="px-6 py-4 text-center">Verification Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-slate-950/10 divide-y divide-slate-800/40 text-slate-300">
                      {historicalHeats.map((heat, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/20 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className="px-2.5 py-1 rounded-full text-[11px] font-bold font-mono border"
                              style={{
                                backgroundColor: `${HEAT_COLORS[idx % HEAT_COLORS.length]}15`,
                                borderColor: `${HEAT_COLORS[idx % HEAT_COLORS.length]}30`,
                                color: HEAT_COLORS[idx % HEAT_COLORS.length]
                              }}
                            >
                              {heat.cycleNo}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-400">
                            {heat.date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-300">
                            {heat.furnace}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center font-mono text-slate-200">
                            {heat.itemCount} items
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-slate-400">
                            {heat.totalQty} pcs
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-amber-500 font-bold">
                            {heat.totalWeight.toLocaleString()} kg
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-900 border border-slate-800 text-emerald-400 rounded">
                              Saved & Confirmed
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}