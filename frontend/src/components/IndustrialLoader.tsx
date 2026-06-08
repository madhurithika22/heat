import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, Activity, ShieldCheck, Cpu, 
  Database, Sparkles, TrendingUp, CheckCircle, ChevronRight, AlertTriangle
} from "lucide-react";
import { Button } from "./ui/button";

interface IndustrialLoaderProps {
  fileName: string | null;
  onComplete: () => void;
  apiFinished: boolean; // Tracks if the backend API has resolved
  errorOccurred: string | null; // Tracks if the backend API has failed
  theme: "light" | "dark"; // Active theme
}

export function IndustrialLoader({ fileName, onComplete, apiFinished, errorOccurred, theme }: IndustrialLoaderProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [activeStepName, setActiveStepName] = useState("DOCUMENT RECEIVED");
  const [logs, setLogs] = useState<string[]>([]);
  const [gates, setGates] = useState([false, false, false]); // Gate 1, Gate 2, Gate 3
  const [showCompletion, setShowCompletion] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const isLight = theme === "light";

  // Stepper timeline
  const stepDefinitions = [
    { id: 1, name: "DOCUMENT RECEIVED", triggerTime: 0 },
    { id: 2, name: "ROUTING TO OCR STATION", triggerTime: 700 },
    { id: 3, name: "OCR EXTRACTION IN PROGRESS", triggerTime: 1400 },
    { id: 4, name: "AI FIELD RECOGNITION", triggerTime: 2300 },
    { id: 5, name: "VALIDATING EXTRACTION", triggerTime: 3200 },
    { id: 6, name: "BUILDING DIGITAL RECORD", triggerTime: 4100 },
    { id: 7, name: "GENERATING INSIGHTS", triggerTime: 4700 },
    { id: 8, name: "DIGITAL TWIN ASSEMBLY", triggerTime: 5300 }
  ];

  // Live industrial log items
  const logEvents = [
    { time: 100, text: "🔧 System online: Automated Tray Retrieval active" },
    { time: 350, text: "📦 Conveyor belt engaged. Staging file: " },
    { time: 800, text: "🤖 Routing production batch item to OCR scan station" },
    { time: 1200, text: "🚧 Safety lock engaged. Scanning chamber isolated" },
    { time: 1500, text: "📡 Airport Baggage-Style laser sweep initialized" },
    { time: 1800, text: "🔎 Mapping OCR character matrix (5,184 nodes)" },
    { time: 2100, text: "⚡ Extraction table structure identified" },
    { time: 2400, text: "🧠 AI neural parsing parser online: generating JSON payload" },
    { time: 2700, text: "🧬 Key semantic identifiers located: Heat No, Material Grade" },
    { time: 3000, text: "⚙️ Dispatching fields to Validation Gate pipeline" },
    { time: 3300, text: "🔒 Gate 1: Field constraints check... PASSED" },
    { time: 3600, text: "🔒 Gate 2: Mathematical parity & weights check... PASSED" },
    { time: 3900, text: "🔒 Gate 3: DB Schema structure verification... PASSED" },
    { time: 4200, text: "💾 Extracting digital twin fields into floating memory" },
    { time: 4500, text: "🧱 Assembling digital twin matrix record structures" },
    { time: 4800, text: "📊 Holographic charts rendered: tonnage cluster active" },
    { time: 5100, text: "✨ Synchronizing digital twin assets with MongoDB ledger" },
    { time: 5400, text: "🏁 Conveyor motor shutdown. Item arrived at buffer station" }
  ];

  // Auto-scroll log console
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Run the animation sequences
  useEffect(() => {
    // 1. Advance steps on set timeout triggers
    const stepTimers = stepDefinitions.map((s) => {
      return setTimeout(() => {
        setCurrentStep(s.id);
        setActiveStepName(s.name);
        
        // Custom gate trigger animations
        if (s.id === 5) {
          setTimeout(() => setGates([true, false, false]), 200);
          setTimeout(() => setGates([true, true, false]), 500);
          setTimeout(() => setGates([true, true, true]), 800);
        }
      }, s.triggerTime);
    });

    // 2. Append console logs
    const logTimers = logEvents.map((evt) => {
      return setTimeout(() => {
        let text = evt.text;
        if (evt.text.includes("Staging file:") && fileName) {
          text = evt.text + fileName;
        }
        setLogs((prev) => [...prev, text]);
      }, evt.time);
    });

    // 3. Handle transition to completion card
    const completionTimer = setTimeout(() => {
      setShowCompletion(true);
    }, 5900);

    return () => {
      stepTimers.forEach(clearTimeout);
      logTimers.forEach(clearTimeout);
      clearTimeout(completionTimer);
    };
  }, [fileName]);

  // Auto-redirect or manual confirmation helper when API completes
  const handleProceed = () => {
    onComplete();
  };

  // Auto-redirect when both animation is done and API is resolved
  useEffect(() => {
    if (showCompletion && apiFinished && !errorOccurred) {
      const autoRedirect = setTimeout(() => {
        onComplete();
      }, 2500);
      return () => clearTimeout(autoRedirect);
    }
  }, [showCompletion, apiFinished, errorOccurred]);

  // Dynamic document positions on track
  const getDocumentXPos = () => {
    if (showCompletion) return "85%";
    const percent = 10 + (currentStep - 1) * 10;
    return `${percent}%`;
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col md:flex-row transition-colors duration-300 font-sans overflow-hidden ${
        isLight ? "bg-slate-50 text-slate-800" : "bg-[#06152B] text-slate-100"
      }`}
    >
      {/* CSS Styles injection for theme-aware industrial animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes conveyorStripe {
          0% { background-position: 0 0; }
          100% { background-position: 40px 0; }
        }
        @keyframes rotateGear {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes laserScan {
          0%, 100% { top: 0%; opacity: 0.3; }
          50% { top: 100%; opacity: 1; }
        }
        @keyframes gridPulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.5; }
        }
        @keyframes particleFloat {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-80px) scale(1.2); opacity: 0; }
        }
        @keyframes cardAssemble {
          0% { transform: translate(150px, -150px) rotate(15deg); opacity: 0; }
          100% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
        }
        @keyframes holoGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(0,212,255,0.15), inset 0 0 5px rgba(0,212,255,0.08); }
          50% { box-shadow: 0 0 25px rgba(0,212,255,0.45), inset 0 0 15px rgba(0,212,255,0.25); }
        }
        
        .conveyor-stripe {
          background-image: linear-gradient(45deg, ${
            isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.05)"
          } 25%, transparent 25%, transparent 50%, ${
            isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.05)"
          } 50%, ${
            isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.05)"
          } 75%, transparent 75%, transparent);
          background-size: 40px 40px;
          animation: conveyorStripe 0.8s linear infinite;
        }
        .gear-rotate {
          animation: rotateGear 2.5s linear infinite;
        }
        .laser-sweep {
          animation: laserScan 1.6s ease-in-out infinite;
        }
        .scan-grid {
          background-size: 15px 15px;
          background-image: linear-gradient(to right, ${
            isLight ? "rgba(0, 212, 255, 0.08)" : "rgba(0, 212, 255, 0.05)"
          } 1px, transparent 1px), linear-gradient(to bottom, ${
            isLight ? "rgba(0, 212, 255, 0.08)" : "rgba(0, 212, 255, 0.05)"
          } 1px, transparent 1px);
          animation: gridPulse 2s ease-in-out infinite;
        }
        .particle {
          animation: particleFloat 1.2s ease-in-out infinite;
        }
        .holo-flicker {
          animation: holoGlow 3s ease-in-out infinite;
        }
      `}} />

      {/* Main conveyor animation viewport */}
      <div 
        className={`flex-1 flex flex-col relative p-6 border-b md:border-b-0 md:border-r transition-colors duration-300 ${
          isLight ? "border-slate-200" : "border-slate-800"
        }`}
      >
        
        {/* Top Header telemetry */}
        <div className={`flex items-center justify-between border-b pb-4 mb-6 ${isLight ? "border-slate-200" : "border-slate-800/80"}`}>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#00B4D8]">Digitization Station v4.0</div>
            <h2 className={`text-lg font-bold flex items-center gap-2 mt-1 ${isLight ? "text-slate-800" : "text-white"}`}>
              <Cpu className="w-4 h-4 text-[#00D4FF] animate-pulse" />
              INTELLIGENT PRODUCTION CONVEYOR
            </h2>
          </div>
          <div className={`flex items-center gap-4 text-xs font-mono ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            <div>
              SYS_TEMP: <span className="text-amber-500 font-semibold">42.8 °C</span>
            </div>
            <div>
              FEED_RATE: <span className="text-[#00B4D8] font-semibold">1.0 / batch</span>
            </div>
          </div>
        </div>

        {/* Central Conveyor System Sandbox */}
        <div className="flex-1 flex flex-col justify-center items-center relative min-h-[350px]">
          
          {/* Blueprint Grid Lines overlay */}
          <div 
            className={`absolute inset-0 scan-grid rounded-xl border transition-all duration-300 ${
              isLight ? "border-slate-200/80 bg-white" : "border-slate-800/60 bg-slate-950/40"
            }`} 
          />

          {/* Glowing background scanner blur */}
          <div className="absolute left-[35%] right-[35%] top-[15%] bottom-[30%] bg-[#00D4FF]/5 rounded-lg blur-2xl pointer-events-none" />

          {/* Stepper Status Indicators */}
          <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
            {stepDefinitions.map((step) => {
              const active = currentStep >= step.id;
              const current = currentStep === step.id;
              return (
                <div key={step.id} className="flex flex-col items-center gap-1.5 flex-1 relative">
                  {/* Step Connector line */}
                  {step.id < 8 && (
                    <div 
                      className={`absolute top-2.5 left-[50%] right-[-50%] h-[2px] transition-all duration-300 ${
                        currentStep > step.id 
                          ? "bg-gradient-to-r from-[#00D4FF] to-[#6E7BFF]" 
                          : isLight ? "bg-slate-200" : "bg-slate-800"
                      }`} 
                    />
                  )}
                  {/* Step node indicator */}
                  <div 
                    className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-mono font-bold transition-all duration-300 relative z-10 ${
                      current
                        ? isLight 
                          ? "bg-white border-[#00D4FF] text-[#00B4D8] shadow-[0_0_10px_rgba(0,212,255,0.3)]"
                          : "bg-[#06152B] border-[#00D4FF] text-[#00D4FF] shadow-[0_0_10px_rgba(0,212,255,0.4)]"
                        : active
                          ? "bg-[#6E7BFF] border-[#6E7BFF] text-white"
                          : isLight 
                            ? "bg-slate-100 border-slate-200 text-slate-400"
                            : "bg-slate-900 border-slate-800 text-slate-500"
                    }`}
                  >
                    {step.id}
                  </div>
                  <span className={`text-[8px] font-semibold tracking-wider hidden xl:inline uppercase ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                    {step.name.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* THE PHYSICAL CONVEYOR TRACK ASSEMBLY */}
          <div className="w-full max-w-[90%] h-48 relative mt-12 flex items-center justify-center">
            
            {/* The Conveyor Belt Runway */}
            <div 
              className={`absolute inset-x-0 bottom-10 h-10 rounded-lg border-t-2 border-b-2 shadow-inner flex items-center transition-colors duration-300 ${
                isLight ? "bg-slate-100 border-slate-300 shadow-slate-300/40" : "bg-slate-900 border-slate-800 shadow-2xl"
              }`}
            >
              <div className="w-full h-full conveyor-stripe opacity-65" />
            </div>

            {/* Conveyor Rollers (rotating gears) */}
            <div className="absolute inset-x-0 bottom-4 h-6 flex justify-around px-8 pointer-events-none">
              {Array.from({ length: 9 }).map((_, idx) => (
                <div 
                  key={idx} 
                  className={`w-5 h-5 rounded-full border flex items-center justify-center gear-rotate transition-colors duration-300 ${
                    isLight ? "border-slate-350 bg-slate-200 text-slate-400" : "border-slate-700 bg-slate-800 text-slate-600"
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${isLight ? "bg-slate-400" : "bg-slate-950"}`} />
                  <div className={`absolute w-[2px] h-4 ${isLight ? "bg-slate-300" : "bg-slate-700/50"}`} />
                  <div className={`absolute h-[2px] w-4 ${isLight ? "bg-slate-300" : "bg-slate-700/50"}`} />
                </div>
              ))}
            </div>

            {/* SCANNING TUNNEL / CHAMBER */}
            <div 
              className={`absolute left-[38%] w-[24%] top-0 bottom-10 border-2 border-dashed rounded-lg overflow-hidden flex flex-col justify-between items-center py-2 shadow-sm transition-colors duration-300 ${
                isLight 
                  ? "border-[#00D4FF]/40 bg-[#00D4FF]/5 shadow-[#00D4FF]/10" 
                  : "border-[#00D4FF]/30 bg-[#00D4FF]/5 shadow-[inset_0_0_15px_rgba(0,212,255,0.1)]"
              } holo-flicker`}
            >
              <div className="w-full border-b border-[#00D4FF]/20 px-2 flex justify-between text-[7px] text-[#00B4D8] font-mono select-none">
                <span>OCR_STATION_03</span>
                <span className="animate-pulse">● SWEEP_ACTIVE</span>
              </div>
              
              {/* Laser beam Sweep Effect */}
              {currentStep === 3 && (
                <div 
                  className={`absolute inset-x-0 h-[2px] laser-sweep z-20 ${
                    isLight ? "bg-[#00B4D8] shadow-[0_0_12px_#00B4D8]" : "bg-[#00D4FF] shadow-[0_0_12px_#00D4FF]"
                  }`} 
                />
              )}

              {/* Scanning visual overlay */}
              <div className="w-full h-full bg-[#00D4FF]/5 flex items-center justify-center select-none opacity-20">
                <ShieldCheck className="w-10 h-10 text-[#00B4D8]" />
              </div>
              <div className="text-[7px] text-[#00B4D8]/80 font-mono">INSIDE SCANNER CHAMBER</div>
            </div>

            {/* AI DECISION CHAMBER */}
            <div 
              className={`absolute left-[65%] w-[20%] top-6 bottom-10 border rounded-md flex flex-col justify-center items-center p-2 transition-colors duration-300 ${
                isLight ? "border-slate-250 bg-slate-100/80" : "border-slate-800 bg-slate-950/60"
              }`}
            >
              <Cpu className={`w-6 h-6 mb-1 ${currentStep === 4 ? "text-[#6E7BFF] animate-pulse" : "text-slate-400"}`} />
              <div className="text-[7px] text-slate-400 font-mono tracking-widest uppercase">AI_ENGINE</div>
              
              {/* Particle flow generator */}
              {currentStep === 4 && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                  <div className="absolute left-1/4 bottom-1/4 w-1.5 h-1.5 rounded-full bg-[#00D4FF] particle" style={{ animationDelay: '0.1s' }} />
                  <div className="absolute left-2/4 bottom-1/4 w-2 h-2 rounded-full bg-[#6E7BFF] particle" style={{ animationDelay: '0.4s' }} />
                  <div className="absolute left-3/4 bottom-1/4 w-1 h-1 rounded-full bg-emerald-450 particle" style={{ animationDelay: '0.7s' }} />
                </div>
              )}
            </div>

            {/* THE PHYSICAL DOCUMENT ITEM CARRIED BY CONVEYOR */}
            <div 
              className={`absolute bottom-11 w-16 h-20 rounded shadow-2xl flex flex-col justify-between p-2 transition-all duration-700 ease-out z-30 ${
                isLight ? "bg-white border border-slate-300" : "bg-slate-900 border border-slate-700/80"
              }`}
              style={{ left: getDocumentXPos(), transform: "translateX(-50%)" }}
            >
              {/* Card top bar */}
              <div className={`flex items-center justify-between border-b pb-1 ${isLight ? "border-slate-100" : "border-slate-800"}`}>
                <FileText className="w-3.5 h-3.5 text-[#00B4D8]" />
                <span className="text-[5px] font-mono text-slate-400 font-semibold">BATCH: C42</span>
              </div>
              {/* Mini Blueprint lines simulating a document */}
              <div className="space-y-1 flex-1 py-1.5">
                <div className={`h-1 rounded w-full ${isLight ? "bg-slate-100" : "bg-slate-800"}`} />
                <div className={`h-1 rounded w-4/5 ${isLight ? "bg-slate-100" : "bg-slate-800"}`} />
                <div className={`h-1 rounded w-5/6 ${isLight ? "bg-slate-100" : "bg-slate-800"}`} />
                <div className="h-1 bg-[#00D4FF]/25 rounded w-2/3" />
              </div>

              {/* Status lights on document card */}
              <div className="flex items-center gap-1">
                <span className={`w-1 h-1 rounded-full ${currentStep >= 3 ? "bg-[#00D4FF] animate-ping" : "bg-slate-300"}`} />
                <span className={`w-1 h-1 rounded-full ${currentStep >= 5 ? "bg-emerald-500" : "bg-slate-300"}`} />
                <span className="text-[4px] font-mono text-[#00B4D8]">ON_BELT</span>
              </div>
            </div>

            {/* VALIDATION GATES indicator */}
            <div className="absolute left-[56%] top-4 bottom-10 w-4 flex flex-col justify-around items-center z-40 pointer-events-none">
              <div 
                className={`flex flex-col gap-1 items-center border p-1.5 rounded-full transition-colors duration-300 ${
                  isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/90 border-slate-800"
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${gates[0] ? "bg-emerald-500 shadow-[0_0_5px_#22C55E]" : "bg-red-500"}`} />
                <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${gates[1] ? "bg-emerald-500 shadow-[0_0_5px_#22C55E]" : "bg-red-500"}`} />
                <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${gates[2] ? "bg-emerald-500 shadow-[0_0_5px_#22C55E]" : "bg-red-500"}`} />
              </div>
            </div>

            {/* HOLOGRAPHIC KPI / CHART RISE (Step 7) */}
            {currentStep === 7 && (
              <div 
                className={`absolute left-[70%] bottom-32 w-36 border p-2 rounded shadow-md animate-pulse z-40 flex flex-col gap-1 ${
                  isLight 
                    ? "bg-[#00D4FF]/10 border-[#00B4D8]/30 text-slate-800" 
                    : "bg-[#00D4FF]/10 border-[#00D4FF]/30 text-white shadow-[0_0_15px_rgba(0,212,255,0.2)]"
                }`}
              >
                <div className="text-[7px] text-[#00B4D8] font-mono uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-2.5 h-2.5" />
                  Generating Hologram
                </div>
                <div className="h-6 flex items-end justify-between px-1 gap-1">
                  <div className="w-2 bg-gradient-to-t from-[#00D4FF]/20 to-[#00B4D8] h-[30%] rounded-sm" />
                  <div className="w-2 bg-gradient-to-t from-[#00D4FF]/20 to-[#00B4D8] h-[75%] rounded-sm" />
                  <div className="w-2 bg-gradient-to-t from-[#00D4FF]/20 to-[#00B4D8] h-[50%] rounded-sm" />
                  <div className="w-2 bg-gradient-to-t from-[#00D4FF]/20 to-[#00B4D8] h-[90%] rounded-sm" />
                </div>
              </div>
            )}

            {/* DIGITAL TWIN RECORD CARDS FLY-IN (Step 6) */}
            {currentStep === 6 && (
              <div className="absolute left-[65%] bottom-28 z-40 pointer-events-none flex flex-col gap-1">
                {["HEAT: C4284", "WEIGHT: 1342KG", "GRADE: WCB"].map((val, idx) => (
                  <div 
                    key={val} 
                    className={`font-mono text-[7px] px-1.5 py-0.5 rounded shadow ${
                      isLight 
                        ? "bg-[#6E7BFF]/10 border border-[#6E7BFF]/30 text-slate-700" 
                        : "bg-[#6E7BFF]/20 border border-[#6E7BFF]/40 text-white shadow-[0_0_8px_rgba(110,123,255,0.2)]"
                    }`}
                    style={{ 
                      animation: "cardAssemble 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards", 
                      animationDelay: `${idx * 0.15}s` 
                    }}
                  >
                    {val}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Active Step display panel */}
        <div 
          className={`mt-4 border rounded-xl p-4 flex items-center justify-between transition-colors duration-300 ${
            isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/60 border-slate-800/80"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D4FF] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00B4D8]"></span>
            </span>
            <div>
              <div className="text-[9px] uppercase tracking-widest text-slate-400 font-mono">CONVEYOR STATUS</div>
              <div className={`text-sm font-bold tracking-wide ${isLight ? "text-slate-800" : "text-white"}`}>{activeStepName}</div>
            </div>
          </div>
          
          <div 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border font-mono text-xs transition-colors duration-300 ${
              isLight ? "bg-slate-50 border-slate-200 text-slate-500" : "bg-slate-950 border-slate-800 text-slate-400"
            }`}
          >
            <span>PIPELINE STATE:</span>
            <span className="text-[#00B4D8] font-bold">RUNNING_SEQ_{currentStep}/8</span>
          </div>
        </div>
      </div>

      {/* Right Side Live Telemetry Console */}
      <div 
        className={`w-full md:w-80 flex flex-col p-6 overflow-hidden border-t md:border-t-0 select-none transition-colors duration-300 ${
          isLight ? "bg-slate-100/50 border-slate-200" : "bg-slate-950 border-slate-800"
        }`}
      >
        <div className={`flex items-center gap-2 border-b pb-3 mb-4 ${isLight ? "border-slate-250" : "border-slate-800/60"}`}>
          <Activity className="w-4 h-4 text-[#00B4D8]" />
          <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-600" : "text-slate-400"}`}>PROCESS TELEMETRY LOG</h3>
        </div>

        {/* The Live Console list */}
        <div 
          className={`flex-1 overflow-y-auto font-mono text-[10px] space-y-2.5 max-h-[300px] md:max-h-none scrollbar-thin ${
            isLight 
              ? "text-emerald-700 scrollbar-thumb-slate-200" 
              : "text-emerald-400/90 scrollbar-thumb-slate-800"
          }`}
        >
          {logs.map((log, idx) => (
            <div 
              key={idx} 
              className={`flex items-start gap-1.5 py-0.5 border-b last:border-0 ${
                isLight ? "border-slate-200/60" : "border-slate-900"
              }`}
            >
              <span className="text-[#00B4D8] select-none">▶</span>
              <span className="break-words leading-normal font-semibold">{log}</span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>

        {/* Completion Panel Overlay */}
        {showCompletion && (
          <div 
            className={`mt-4 pt-4 border rounded-lg p-4 flex flex-col gap-3.5 animate-in fade-in slide-in-from-bottom-3 duration-500 ${
              isLight ? "bg-white border-slate-250 shadow-sm" : "bg-slate-900/50 border-slate-800"
            }`}
          >
            {errorOccurred ? (
              <>
                <div className="flex items-center gap-2 text-rose-500">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-bold uppercase">DIGITIZATION ERROR</span>
                </div>
                <div className={`text-[10px] font-mono break-words leading-relaxed ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  {errorOccurred}
                </div>
                <Button 
                  onClick={handleProceed}
                  variant="outline" 
                  className={`w-full text-xs h-9 font-semibold ${
                    isLight 
                      ? "text-rose-600 border-rose-500/40 hover:bg-rose-500/5 bg-white" 
                      : "text-rose-400 border-rose-500/50 hover:bg-rose-500/10"
                  }`}
                >
                  Close & View Details
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-emerald-500">
                  <CheckCircle className="w-5 h-5 shrink-0 animate-bounce" />
                  <span className="text-xs font-bold uppercase tracking-wider">DIGITAL TWIN CREATED</span>
                </div>
                
                <div 
                  className={`space-y-1.5 font-mono text-[11px] border-t border-b py-2.5 transition-colors duration-300 ${
                    isLight ? "text-slate-500 border-slate-200" : "text-slate-400 border-slate-800/80"
                  }`}
                >
                  <div className="flex justify-between">
                    <span>Fields Extracted:</span>
                    <span className={`font-bold ${isLight ? "text-slate-800" : "text-white"}`}>34</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Confidence Score:</span>
                    <span className="text-[#00B4D8] font-bold">98.7%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Processing Duration:</span>
                    <span className="text-emerald-500 font-bold">4.2 Seconds</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={handleProceed}
                    disabled={!apiFinished}
                    className="w-full text-xs h-9 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold shadow-md hover:shadow-emerald-500/20"
                  >
                    {!apiFinished ? (
                      <span className="flex items-center gap-2 justify-center">
                        <span className="h-3 w-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        Finishing Ledger write...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1">
                        VIEW DIGITAL TWIN
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                  {!apiFinished && (
                    <div className="text-[8px] font-mono text-slate-400 text-center uppercase tracking-widest animate-pulse mt-1">
                      Waiting for API completion ledger write
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
