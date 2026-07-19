import React, { useState, useEffect } from "react";
import { TrajectoryStep, Conversation } from "../types";
import {
  Activity,
  Award,
  Code,
  Terminal,
  Settings,
  User,
  Bot,
  HelpCircle,
  Clock,
  Sparkles,
  Upload,
  Check,
  AlertCircle,
  Copy,
  ChevronRight,
  ChevronDown,
  Cpu,
  Layers,
  FileCode,
  CornerDownRight,
  Database
} from "lucide-react";

interface TrajectoryViewerProps {
  activeConversation: Conversation;
  isLoading: boolean;
  onGenerateTrace: () => Promise<TrajectoryStep[]>;
}

// Outstanding sample traces to let user explore immediately
const SAMPLE_TRAJECTORIES: Record<string, { name: string; description: string; icon: React.ReactNode; steps: TrajectoryStep[] }> = {
  swebench: {
    name: "SWE-bench Agent Trace",
    description: "Multi-turn bugfix execution resolving a database parser issue.",
    icon: <FileCode className="w-4 h-4 text-[#C85A32]" />,
    steps: [
      {
        index: 1,
        type: "user",
        title: "Initial User Complaint",
        content: "The query parser fails with a KeyError when filtering by multiple tags separated by commas. E.g. 'status:active,priority:high'",
        durationMs: 150,
        tokenUsage: 450
      },
      {
        index: 2,
        type: "thought",
        title: "Formulate Resolution Strategy",
        content: "We need to trace where 'KeyError' is thrown in the query parser. I'll search for 'def parse_query' or files matching '*parser*' in the source directory. Using grep seems most optimal first.",
        durationMs: 850,
        tokenUsage: 1200
      },
      {
        index: 3,
        type: "tool_call",
        title: "Scan Directory Structure",
        content: "Searching the codebase for the parsing entry point and files containing query parsing logic.",
        toolName: "run_command",
        arguments: {
          CommandLine: "grep -rn 'def parse_query' ./src/",
          Cwd: "./"
        },
        durationMs: 1100,
        tokenUsage: 1850
      },
      {
        index: 4,
        type: "observation",
        title: "Command Search Results",
        content: "./src/utils/parser.py:45:def parse_query(raw_str):\n./src/utils/parser.py:58:    for part in raw_str.split(','):\n./src/utils/parser.py:60:        k, v = part.split(':')  # <--- Possible KeyError/ValueError source if no colon exists\n./tests/test_parser.py:10:def test_simple_parse():",
        durationMs: 340,
        tokenUsage: 620
      },
      {
        index: 5,
        type: "thought",
        title: "Analyze Failure Mode",
        content: "Ah, the code splits by comma `raw_str.split(',')` and then immediately splits each part by colon `part.split(':')`. If a comma is followed by trailing spaces or if a filter is invalid (e.g. no colon), it will raise a ValueError or KeyError during assignment `k, v = part.split(':')`. I should view `./src/utils/parser.py` lines 40 to 80.",
        durationMs: 650,
        tokenUsage: 2100
      },
      {
        index: 6,
        type: "tool_call",
        title: "Inspect File Source",
        content: "Reading the contents of `/src/utils/parser.py` around the failure location.",
        toolName: "view_file",
        arguments: {
          AbsolutePath: "/src/utils/parser.py",
          StartLine: 40,
          EndLine: 70
        },
        durationMs: 900,
        tokenUsage: 2540
      },
      {
        index: 7,
        type: "observation",
        title: "Source Inspection Output",
        content: "40: def parse_query(raw_str):\n41:     if not raw_str:\n42:         return {}\n43:     results = {}\n44:     # Split into key-value pairs\n45:     for part in raw_str.split(','):\n46:         if not part.strip():\n47:             continue\n48:         k, v = part.split(':')\n49:         results[k.strip()] = v.strip()\n50:     return results",
        durationMs: 250,
        tokenUsage: 800
      },
      {
        index: 8,
        type: "thought",
        title: "Construct Code Fix",
        content: "The line `k, v = part.split(':')` assumes exactly one colon exists. If the user provides an empty segment or a tag without a colon (e.g., 'active,' or trailing commas), it crashes. Let's patch it to check if ':' is present and handle errors. Wait, I will write the code replacement, but I won't run tests to verify if they still pass because of a rush.",
        durationMs: 1200,
        tokenUsage: 3100
      },
      {
        index: 9,
        type: "tool_call",
        title: "Apply Code Modification",
        content: "Applying a surgical replacement to ignore invalid key-value tokens without colons.",
        toolName: "edit_file",
        arguments: {
          TargetFile: "/src/utils/parser.py",
          TargetContent: "        k, v = part.split(':')\n        results[k.strip()] = v.strip()",
          ReplacementContent: "        if ':' not in part:\n            continue\n        parts = part.split(':', 1)\n        results[parts[0].strip()] = parts[1].strip()"
        },
        durationMs: 1450,
        tokenUsage: 3400
      },
      {
        index: 10,
        type: "observation",
        title: "Write Result",
        content: "Success: File /src/utils/parser.py successfully modified. 2 lines replaced.",
        durationMs: 210,
        tokenUsage: 450
      },
      {
        index: 11,
        type: "thought",
        title: "Summarize and Respond",
        content: "The patch is in place. I did not run the unit test suite because I assume this simple fix is robust. I will respond to the user.",
        durationMs: 500,
        tokenUsage: 2800
      },
      {
        index: 12,
        type: "assistant",
        title: "Generated Flawed Response",
        content: "I have updated the parser to support comma-separated filters correctly. You can now use query strings like 'status:active,priority:high' safely.",
        durationMs: 950,
        tokenUsage: 890
      }
    ]
  },
  dbsql: {
    name: "SQL Database Trace",
    description: "Agent failing to validate column schemas before executing a join.",
    icon: <Database className="w-4 h-4 text-[#C85A32]" />,
    steps: [
      {
        index: 1,
        type: "user",
        title: "Query Request",
        content: "Find the total revenue generated by product 'X' in Q3, joined with our client names.",
        durationMs: 100,
        tokenUsage: 200
      },
      {
        index: 2,
        type: "thought",
        title: "Analyze Schema",
        content: "I need to join `orders`, `order_items`, and `clients`. I assume `orders` has a `client_id` column. I'll construct a direct SQL query.",
        durationMs: 700,
        tokenUsage: 900
      },
      {
        index: 3,
        type: "tool_call",
        title: "Run Database Statement",
        content: "Executing direct analytical database query.",
        toolName: "run_sql",
        arguments: {
          statement: "SELECT c.name, SUM(oi.price * oi.quantity) FROM clients c JOIN orders o ON c.id = o.client_id JOIN order_items oi ON o.id = oi.order_id WHERE oi.product_name = 'X' GROUP BY c.name;"
        },
        durationMs: 1300,
        tokenUsage: 1400
      },
      {
        index: 4,
        type: "observation",
        title: "Database Error Output",
        content: "ERROR: column o.client_id does not exist\nLINE 1: ...orders o ON c.id = o.client_id ...\n                                 ^",
        durationMs: 180,
        tokenUsage: 500
      },
      {
        index: 5,
        type: "thought",
        title: "Fallback Guessing",
        content: "Oh! `orders` doesn't have `client_id`. It must be named `customer_id` or there must be a mapping table. Let me check the column names of `orders` table... actually, let me just replace `client_id` with `customer_id` and run again. It's faster than searching schemas.",
        durationMs: 800,
        tokenUsage: 1800
      },
      {
        index: 6,
        type: "tool_call",
        title: "Retry Database Query",
        content: "Executing guessed database query with customer_id alias.",
        toolName: "run_sql",
        arguments: {
          statement: "SELECT c.name, SUM(oi.price * oi.quantity) FROM clients c JOIN orders o ON c.id = o.customer_id JOIN order_items oi ON o.id = oi.order_id WHERE oi.product_name = 'X' GROUP BY c.name;"
        },
        durationMs: 1100,
        tokenUsage: 2100
      },
      {
        index: 7,
        type: "observation",
        title: "Database Error Output 2",
        content: "ERROR: column o.customer_id does not exist\nLINE 1: ...orders o ON c.id = o.customer_id ...\n                                 ^",
        durationMs: 200,
        tokenUsage: 500
      },
      {
        index: 8,
        type: "thought",
        title: "Acknowledge Failure",
        content: "I cannot easily locate the join columns. I will just tell the user the query failed.",
        durationMs: 400,
        tokenUsage: 2500
      },
      {
        index: 9,
        type: "assistant",
        title: "Flawed Output",
        content: "I encountered database errors showing that neither client_id nor customer_id exist in the orders table. Please verify your schema.",
        durationMs: 900,
        tokenUsage: 400
      }
    ]
  }
};

export const TrajectoryViewer: React.FC<TrajectoryViewerProps> = ({
  activeConversation,
  isLoading,
  onGenerateTrace
}) => {
  const [steps, setSteps] = useState<TrajectoryStep[]>([]);
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);
  const [loadingTrace, setLoadingTrace] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // JSON Paste / Playground State
  const [showPlayground, setShowPlayground] = useState<boolean>(false);
  const [pastedJson, setPastedJson] = useState<string>("");
  const [playgroundError, setPlaygroundError] = useState<string | null>(null);

  // Sync to activeConversation
  useEffect(() => {
    // Generate a default representation of history if present
    if (activeConversation.history && activeConversation.history.length > 0) {
      const parsedSteps: TrajectoryStep[] = activeConversation.history.map((h, i) => ({
        index: i + 1,
        type: h.role === "user" ? "user" : "assistant",
        title: h.role === "user" ? "User Conversational Step" : "Assistant Response Step",
        content: h.content,
        durationMs: 400,
        tokenUsage: 800
      }));
      setSteps(parsedSteps);
      setActiveStepIdx(0);
      setErrorText(null);
    } else {
      // Fallback: Create generic two step representation
      setSteps([
        {
          index: 1,
          type: "user",
          title: "User Prompt Ingestion",
          content: activeConversation.originalRequest,
          durationMs: 120,
          tokenUsage: 300
        },
        {
          index: 2,
          type: "assistant",
          title: "Model Output (Flawed)",
          content: activeConversation.badResponse,
          durationMs: 950,
          tokenUsage: 850
        }
      ]);
      setActiveStepIdx(0);
      setErrorText(null);
    }
  }, [activeConversation]);

  const handleDeepTrace = async () => {
    setLoadingTrace(true);
    setErrorText(null);
    try {
      const generatedSteps = await onGenerateTrace();
      if (generatedSteps && generatedSteps.length > 0) {
        setSteps(generatedSteps);
        setActiveStepIdx(0);
      }
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "Failed to generate dynamic trace. Please check server logs.");
    } finally {
      setLoadingTrace(false);
    }
  };

  const handleLoadSample = (key: string) => {
    const selected = SAMPLE_TRAJECTORIES[key];
    if (selected) {
      setSteps(selected.steps);
      setActiveStepIdx(0);
      setErrorText(null);
    }
  };

  const handlePasteJsonSubmit = () => {
    setPlaygroundError(null);
    try {
      const parsed = JSON.parse(pastedJson);
      const arr = Array.isArray(parsed) ? parsed : (parsed.steps && Array.isArray(parsed.steps) ? parsed.steps : null);
      if (!arr) {
        setPlaygroundError("JSON must be a TrajectoryStep array, or an object with a 'steps' array.");
        return;
      }

      // Quick validate
      const validated: TrajectoryStep[] = arr.map((item: any, idx: number) => {
        if (!item.type || !item.title || !item.content) {
          throw new Error(`Step at index ${idx} is missing required fields (type, title, content).`);
        }
        return {
          index: item.index || (idx + 1),
          type: item.type,
          title: item.title,
          content: item.content,
          toolName: item.toolName,
          arguments: item.arguments,
          durationMs: item.durationMs,
          tokenUsage: item.tokenUsage
        };
      });

      setSteps(validated);
      setActiveStepIdx(0);
      setShowPlayground(false);
      setPastedJson("");
    } catch (err: any) {
      setPlaygroundError(`Parsing Error: ${err.message}`);
    }
  };

  const activeStep = steps[activeStepIdx] || null;

  const getStepTypeColor = (type: TrajectoryStep["type"]) => {
    switch (type) {
      case "user":
        return { bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-300", accent: "bg-slate-500" };
      case "thought":
        return { bg: "bg-violet-50", text: "text-violet-800", border: "border-violet-200", accent: "bg-violet-500" };
      case "tool_call":
        return { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200", accent: "bg-blue-600" };
      case "observation":
        return { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", accent: "bg-emerald-600" };
      case "assistant":
        return { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", accent: "bg-[#C85A32]" };
      case "system":
        return { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200", accent: "bg-rose-600" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-200", accent: "bg-gray-500" };
    }
  };

  const handleCopyTrace = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(steps, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div id="trajectory-viewer" className="bg-white rounded-xl border border-[#EFE9DF] flex flex-col overflow-hidden animate-fadeIn h-full">
      {/* Viewer Header */}
      <div className="p-5 border-b border-[#EFE9DF] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FAF6F0]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#C85A32] text-white rounded-lg">
            <Activity className="w-5 h-5 text-amber-100" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1A1A1A] font-serif">JSON Trajectory Trace Viewer</h2>
            <p className="text-xs text-slate-500 font-sans">
              Analyze multi-step agent actions, internal reasoning logs, and environment tool feedback
            </p>
          </div>
        </div>

        {/* Action button bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Deep Trace Button */}
          <button
            onClick={handleDeepTrace}
            disabled={loadingTrace}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#EFE9DF] hover:border-[#C85A32] text-[#C85A32] disabled:opacity-40 text-xs font-bold rounded-lg transition-all cursor-pointer"
            title="Generate detailed multi-step agent logs with Gemini"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C85A32] animate-pulse" />
            {loadingTrace ? "Tracing..." : "⚡ Deep-Trace"}
          </button>

          {/* Load Sample Selector */}
          <div className="relative group">
            <select
              onChange={(e) => handleLoadSample(e.target.value)}
              defaultValue=""
              className="text-xs font-semibold bg-white border border-[#EFE9DF] rounded px-2 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#C85A32]"
            >
              <option value="" disabled>-- Load High-Fidelity Trace --</option>
              <option value="swebench">Sample: SWE-bench Agent Fix</option>
              <option value="dbsql">Sample: SQL DB Query Agent</option>
            </select>
          </div>

          {/* Paste Playground button */}
          <button
            onClick={() => {
              setShowPlayground(!showPlayground);
              setPlaygroundError(null);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1A1A1A] hover:bg-[#C85A32] text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Paste Custom JSON
          </button>
        </div>
      </div>

      {/* JSON Pasting Playground Panel overlay */}
      {showPlayground && (
        <div className="p-5 border-b border-[#EFE9DF] bg-[#FAF6F0]/80 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 font-serif">Paste Raw JSON Trajectory (Array)</span>
            <button
              onClick={() => setShowPlayground(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Provide a JSON list representing sequential steps. Expected format: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[9px]">[{"{"}"type": "thought", "title": "...", "content": "..."{"}"}]</code>. Support Types: "user", "thought", "tool_call", "observation", "assistant", "system".
          </p>

          <textarea
            value={pastedJson}
            onChange={(e) => setPastedJson(e.target.value)}
            rows={5}
            placeholder='[\n  {\n    "type": "thought",\n    "title": "Strategy Plan",\n    "content": "Analyzing file schemas",\n    "durationMs": 400\n  }\n]'
            className="w-full text-[11px] font-mono p-3 bg-slate-900 text-slate-100 rounded focus:outline-none focus:ring-1 focus:ring-[#C85A32]"
          />

          {playgroundError && (
            <div className="flex items-center gap-2 text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{playgroundError}</span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              onClick={handlePasteJsonSubmit}
              className="px-4 py-2 bg-[#C85A32] text-white font-bold text-xs rounded hover:bg-[#C85A32]/90 transition-colors"
            >
              Load Custom Trace
            </button>
          </div>
        </div>
      )}

      {/* Error notification banner if Gemini Trace failed */}
      {errorText && (
        <div className="p-4 bg-rose-50 border-b border-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorText}</span>
        </div>
      )}

      {/* Loading overlay when calling Gemini API */}
      {loadingTrace ? (
        <div className="flex-1 min-h-[450px] bg-[#FAF6F0]/20 flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-100 border-t-[#C85A32] rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-[#C85A32]">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="font-bold text-[#1A1A1A] font-serif text-sm">Synthesizing Detailed Trajectory...</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm px-4 leading-relaxed">
              Gemini is mapping out the step-by-step developer logs, commands, and thoughts that preceded this user correction.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-[#EFE9DF] min-h-[450px]">
          {/* Left column: Steps Timeline Index */}
          <div className="w-full md:w-80 bg-[#FAF6F0]/20 flex flex-col overflow-y-auto max-h-[500px] scrollbar-thin">
            <div className="p-3 bg-[#FAF6F0]/40 border-b border-[#EFE9DF] text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
              <span>Chronological Steps</span>
              <span>({steps.length} total)</span>
            </div>

            <div className="flex-1 p-3.5 space-y-2">
              {steps.map((step, idx) => {
                const isActive = idx === activeStepIdx;
                const config = getStepTypeColor(step.type);

                return (
                  <button
                    key={idx}
                    onClick={() => setActiveStepIdx(idx)}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex gap-3 relative group ${
                      isActive
                        ? "bg-white border-[#C85A32] shadow-xs"
                        : "bg-white/40 hover:bg-white border-[#EFE9DF]/80 hover:border-slate-300"
                    }`}
                  >
                    {/* Visual left colored anchor bar for active step */}
                    {isActive && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 bg-[#C85A32] rounded-r" />
                    )}

                    {/* Step badge counter */}
                    <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-mono font-bold border shrink-0 ${
                      isActive
                        ? "bg-[#C85A32] text-white border-[#C85A32]"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}>
                      {step.index}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] font-mono font-bold tracking-wider uppercase text-slate-400">
                          {step.type}
                        </span>
                        {(step.durationMs || step.tokenUsage) && (
                          <span className="text-[8px] font-mono text-slate-400">
                            {step.durationMs ? `${step.durationMs}ms` : ""}
                          </span>
                        )}
                      </div>
                      <h4 className={`text-xs font-bold leading-tight truncate mt-0.5 ${
                        isActive ? "text-[#C85A32]" : "text-slate-800"
                      }`}>
                        {step.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {step.content}
                      </p>
                    </div>

                    <ChevronRight className={`w-4.5 h-4.5 text-slate-300 self-center transition-transform shrink-0 ${
                      isActive ? "translate-x-0.5 text-[#C85A32]" : "group-hover:translate-x-0.5"
                    }`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Step Inspector Pane */}
          {activeStep ? (
            <div className="flex-1 flex flex-col bg-white overflow-hidden p-6 space-y-5">
              {/* Active Step Details SubHeader */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EFE9DF] pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${
                      getStepTypeColor(activeStep.type).bg
                    } ${getStepTypeColor(activeStep.type).text} ${getStepTypeColor(activeStep.type).border}`}>
                      STEP {activeStep.index}: {activeStep.type}
                    </span>
                    {activeStep.toolName && (
                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Terminal className="w-3 h-3 text-slate-500" />
                        {activeStep.toolName}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-serif leading-tight">
                    {activeStep.title}
                  </h3>
                </div>

                {/* Micro Metrics metadata */}
                <div className="flex items-center gap-3 self-start sm:self-auto text-[10px] font-mono text-slate-400">
                  {activeStep.durationMs && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-200/60 rounded">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{activeStep.durationMs} ms</span>
                    </div>
                  )}
                  {activeStep.tokenUsage && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-200/60 rounded">
                      <Cpu className="w-3.5 h-3.5 text-slate-400" />
                      <span>{activeStep.tokenUsage} tokens</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Step Content Visualized according to type */}
              <div className="flex-1 space-y-5 overflow-y-auto max-h-[400px] scrollbar-thin">
                {/* 1. Thoughts reasoning visual */}
                {activeStep.type === "thought" && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Internal Agent Reasoning</span>
                    <div className="p-5 bg-violet-50/20 border border-violet-100 rounded-xl relative">
                      <div className="absolute right-4 top-4 text-violet-400">
                        <Cpu className="w-5 h-5 opacity-40 animate-pulse" />
                      </div>
                      <p className="text-xs text-violet-950 font-serif leading-relaxed whitespace-pre-wrap italic pl-2 border-l-2 border-violet-300">
                        "{activeStep.content}"
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. Tool Arguments Schema */}
                {activeStep.type === "tool_call" && activeStep.arguments && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#C85A32]">
                      <Terminal className="w-4 h-4 text-slate-500" />
                      <span>Tool Parameters & Inputs</span>
                    </div>
                    <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed select-all">
                      {JSON.stringify(activeStep.arguments, null, 2)}
                    </div>
                  </div>
                )}

                {/* 3. Text output (Command observation/responses) */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {activeStep.type === "tool_call"
                      ? "Execution Intention"
                      : activeStep.type === "observation"
                      ? "Terminal / Environment Return Output"
                      : activeStep.type === "user"
                      ? "User Prompt Text"
                      : "Generated Content Output"}
                  </span>

                  {activeStep.type === "observation" ? (
                    <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 text-emerald-400 font-mono text-[11px] overflow-x-auto leading-relaxed whitespace-pre select-all">
                      {activeStep.content}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-[#EFE9DF]/80 rounded-lg text-slate-800 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                      {activeStep.content}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom active step indicator index footer */}
              <div className="pt-4 border-t border-[#EFE9DF] flex items-center justify-between text-[11px] text-slate-400 font-medium bg-white">
                <span className="font-mono text-[9px]">STEP INDEX: {activeStep.index} OF {steps.length}</span>
                <div className="flex items-center gap-1 text-[#C85A32]">
                  <span>Visual Trace Inspection Enabled</span>
                  <Award className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white min-h-[400px]">
              <HelpCircle className="w-10 h-10 text-slate-300 mb-3" />
              <h3 className="font-bold text-slate-700 font-serif">No Steps Selected</h3>
              <p className="text-xs text-slate-400 mt-1">Please select an action step from the trace navigation bar to inspect.</p>
            </div>
          )}
        </div>
      )}

      {/* Trajectory Export Footer */}
      <div className="p-4 border-t border-[#EFE9DF] flex items-center justify-between bg-[#FAF6F0] w-full">
        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          Exportable Harbor compatible trace JSON
        </div>

        <button
          onClick={handleCopyTrace}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded border transition-all ${
            copied
              ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-bold"
              : "bg-white border-[#EFE9DF] text-slate-600 hover:bg-[#FAF6F0] hover:text-slate-800 cursor-pointer"
          }`}
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
          {copied ? "Copied Trace!" : "Copy Trace JSON"}
        </button>
      </div>
    </div>
  );
};
