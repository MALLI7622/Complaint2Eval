import React, { useState } from "react";
import { EvalSuite } from "../types";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Download,
  Terminal,
  Layers,
  Flame
} from "lucide-react";

interface SuitePanelProps {
  suite: EvalSuite | null;
  isLoading: boolean;
}

export const SuitePanel: React.FC<SuitePanelProps> = ({ suite, isLoading }) => {
  const [expandedTestCases, setExpandedTestCases] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"suite" | "roadmap">("suite");

  const toggleExpand = (clusterIdx: number, caseIdx: number) => {
    const key = `${clusterIdx}-${caseIdx}`;
    setExpandedTestCases((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleCopy = async () => {
    if (!suite) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(suite, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = () => {
    if (!suite) return;
    const blob = new Blob([JSON.stringify(suite, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `complaint2eval_suite.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="bg-[#FAF6F0] rounded-xl border border-[#EFE9DF] p-8 flex flex-col items-center justify-center min-h-[450px] space-y-5 animate-fadeIn">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-[#FAF6F0] border-t-[#C85A32] rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-[#C85A32]">
            <Sparkles className="w-6 h-6 animate-pulse text-[#C85A32]" />
          </div>
        </div>
        <div className="text-center max-w-sm">
          <h3 className="font-bold text-[#1A1A1A] font-serif text-base">Mining User Complaints...</h3>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Gemini is clustering complaints to identify recurring failure patterns and synthesizing fresh evaluation test suites.
          </p>
        </div>
      </div>
    );
  }

  if (!suite) {
    return (
      <div className="bg-white rounded-xl border-2 border-dashed border-[#EFE9DF] p-8 flex flex-col items-center justify-center min-h-[450px] text-center">
        <div className="p-4 bg-[#FAF6F0] text-[#C85A32] rounded-full mb-4">
          <Layers className="w-10 h-10 animate-pulse text-[#C85A32]/70" />
        </div>
        <h3 className="font-bold text-slate-700 font-serif text-base">No Eval Suite Compiled</h3>
        <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
          Filter complaints (e.g. select <span className="font-bold">Label 2: CORRECTION</span>) and click <strong className="text-[#C85A32]">"Generate Eval Suite"</strong> to automatically cluster failures and compile custom test suites.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#EFE9DF] flex flex-col overflow-hidden animate-fadeIn">
      {/* Header */}
      <div className="p-5 border-b border-[#EFE9DF] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FAF6F0]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#C85A32] text-white rounded-lg">
            <Sparkles className="w-5 h-5 text-amber-200" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1A1A1A] font-serif">Clustered Eval Suite</h2>
            <p className="text-xs text-slate-500">Pattern-mined test suite from corrections</p>
          </div>
        </div>

        {/* View selection tabs: Suite vs Roadmap */}
        <div className="flex items-center gap-1.5 bg-[#FAF6F0]/40 p-1 rounded-lg border border-[#EFE9DF] self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("suite")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-all ${
              activeTab === "suite"
                ? "bg-white text-[#C85A32] shadow-xs"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Evaluation Suite
          </button>
          <button
            onClick={() => setActiveTab("roadmap")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-all ${
              activeTab === "roadmap"
                ? "bg-white text-[#C85A32] shadow-xs"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            Roadmap & Stats
          </button>
        </div>
      </div>

      {activeTab === "suite" ? (
        <div className="p-6 space-y-6 flex-1 min-h-[400px]">
          {/* Summary Banner */}
          <div className="bg-[#FAF6F0] p-4 rounded-lg border border-[#EFE9DF]">
            <h4 className="text-xs font-bold text-[#C85A32] uppercase tracking-wider mb-1">Mined Insights Summary</h4>
            <p className="text-xs text-slate-600 leading-relaxed italic">
              "{suite.summary}"
            </p>
          </div>

          {/* Clusters */}
          <div className="space-y-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detected Failure Clusters ({suite.clusters.length})</h3>

            {suite.clusters.map((cluster, clusterIdx) => (
              <div key={clusterIdx} className="border border-[#EFE9DF] rounded-lg overflow-hidden hover:border-[#C85A32]/30 transition-all">
                {/* Cluster Header */}
                <div className="bg-[#FAF6F0]/60 px-4 py-3 border-b border-[#EFE9DF] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#C85A32] animate-pulse" />
                    <span className="font-bold text-[#1A1A1A] text-xs font-mono uppercase">
                      Cluster {clusterIdx + 1}: {cluster.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[#C85A32] bg-white border border-[#EFE9DF] px-2.5 py-0.5 rounded">
                    {cluster.count} matching cases
                  </span>
                </div>

                <div className="p-4 space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {cluster.description}
                  </p>

                  {/* Fresh Test Cases */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Generated Evaluation Tests</span>

                    {cluster.testCases.map((testCase, caseIdx) => {
                      const isExpanded = !!expandedTestCases[`${clusterIdx}-${caseIdx}`];
                      return (
                        <div key={caseIdx} className="bg-[#FAF6F0]/30 rounded border border-[#EFE9DF]">
                          {/* Test Header */}
                          <button
                            onClick={() => toggleExpand(clusterIdx, caseIdx)}
                            className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-[#FAF6F0]/60 text-left transition-colors"
                          >
                            <span className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#C85A32]" />
                              {testCase.title}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </button>

                          {/* Test Body */}
                          {isExpanded && (
                            <div className="px-3.5 pb-3.5 pt-1.5 border-t border-[#EFE9DF] space-y-3 animate-fadeIn text-xs">
                              {/* Prompt */}
                              <div className="space-y-1">
                                <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider block">Test Prompt</span>
                                <div className="p-2.5 bg-white rounded border border-[#EFE9DF] font-mono text-[11px] text-slate-700 leading-relaxed select-all">
                                  {testCase.prompt}
                                </div>
                              </div>

                              {/* Expected Outcome */}
                              <div className="space-y-1">
                                <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider block">Expected Outcome</span>
                                <p className="p-2.5 bg-emerald-50/20 text-slate-600 rounded border border-emerald-100/40 leading-relaxed">
                                  {testCase.expectedOutcome}
                                </p>
                              </div>

                              {/* Rubric */}
                              <div className="space-y-1">
                                <span className="font-bold text-[#C85A32] uppercase text-[9px] tracking-wider block">Grading Rubric / Criteria</span>
                                <p className="p-2.5 bg-[#FAF6F0]/50 text-slate-600 rounded border border-[#EFE9DF]/60 leading-relaxed">
                                  {testCase.rubric}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-6 flex-1 min-h-[400px] animate-fadeIn">
          {/* Roadmap and Stats View */}
          <div className="space-y-6">
            <div className="bg-[#FAF6F0] p-5 rounded-xl border border-[#EFE9DF] space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-serif">
                <Terminal className="w-4 h-4 text-[#C85A32]" />
                Automated Pipeline Stats
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                By grouping failures automatically, Complaint2Eval compresses hours of debugging log analysis into clean, regression-test ready evaluation suites instantly.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-white p-3 rounded border border-[#EFE9DF]">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Suite Compression</span>
                  <span className="text-lg font-bold text-[#C85A32] mt-1 block font-serif">5:1 Ratio</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Complaints to Test Clusters</span>
                </div>
                <div className="bg-white p-3 rounded border border-[#EFE9DF]">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Pipeline Output</span>
                  <span className="text-lg font-bold text-emerald-600 mt-1 block font-serif">JSON Schema</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Ready for CI/CD ingestion</span>
                </div>
              </div>
            </div>

            <div className="space-y-3.5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Product Backlog & Roadmap</h3>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="p-3 bg-white rounded border border-[#EFE9DF] flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#FAF6F0] border border-[#EFE9DF] text-[#C85A32] font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</div>
                  <div className="space-y-1">
                    <strong className="text-[#1A1A1A] font-serif">One-Tap Human Swipe Curation</strong>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                      Mobile swipe workspace (approved/reject) to curate synthesized test cases using responsive mobile touch layouts.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white rounded border border-[#EFE9DF] flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#FAF6F0] border border-[#EFE9DF] text-[#C85A32] font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</div>
                  <div className="space-y-1">
                    <strong className="text-[#1A1A1A] font-serif">Direct CI/CD Integration</strong>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                      GitHub action to pull generated evaluation suites and programmatically execute runs on every commit.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white rounded border border-[#EFE9DF] flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#FAF6F0] border border-[#EFE9DF] text-[#C85A32] font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</div>
                  <div className="space-y-1">
                    <strong className="text-[#1A1A1A] font-serif">Dynamic Scorecards & Regression Tracking</strong>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                      Compare live runs against baseline suites and view failure trends over model checkpoints over time.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sharing / Export Row */}
      {suite && (
        <div className="p-4 border-t border-[#EFE9DF] flex items-center justify-between bg-[#FAF6F0]">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C85A32]" />
            Suite ready for CI injection
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded border transition-all ${
                copied
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-white border-[#EFE9DF] text-slate-600 hover:bg-[#FAF6F0] hover:text-slate-800"
              }`}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              {copied ? "Copied!" : "Copy JSON"}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#1A1A1A] hover:bg-[#C85A32] text-white rounded transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Suite
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
