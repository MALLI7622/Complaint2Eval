import React, { useState, useEffect } from "react";
import { Evaluation, WildFBLabelType } from "../types";
import { WILDFB_LABEL_MAP } from "./ConversationList";
import {
  Code,
  Sliders,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  Activity,
  Award,
  Tag
} from "lucide-react";

interface EvalPanelProps {
  evaluation: Evaluation | null;
  onUpdate: (updated: Evaluation) => void;
  isLoading: boolean;
}

export const EvalPanel: React.FC<EvalPanelProps> = ({
  evaluation,
  onUpdate,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<"form" | "json">("form");
  const [jsonText, setJsonText] = useState("");
  const [copied, setCopied] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Sync jsonText when evaluation object updates
  useEffect(() => {
    if (evaluation) {
      setJsonText(JSON.stringify(evaluation, null, 2));
      setJsonError(null);
    } else {
      setJsonText("");
    }
  }, [evaluation]);

  if (isLoading) {
    return (
      <div id="eval-panel-loading" className="bg-[#FAF6F0] rounded-xl border border-[#EFE9DF] p-8 flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-[#FAF6F0] border-t-[#C85A32] rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-[#C85A32]">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
        </div>
        <div className="text-center">
          <h3 className="font-bold text-[#1A1A1A] font-serif text-base">Synthesizing Evaluation Spec...</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Gemini is analyzing the dialogue patterns and formulating precise, machine-verifiable evaluation metrics.
          </p>
        </div>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div id="eval-panel-empty" className="bg-white rounded-xl border-2 border-dashed border-[#EFE9DF] p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="p-4 bg-[#FAF6F0] text-slate-400 rounded-full mb-4">
          <Award className="w-10 h-10 text-[#C85A32]/70" />
        </div>
        <h3 className="font-bold text-slate-700 font-serif text-base">No Evaluation Generated Yet</h3>
        <p className="text-xs text-slate-500 mt-1.5 max-w-sm leading-relaxed">
          Select a dialogue example, tweak the text fields if desired, and click <strong className="text-[#C85A32]">“Generate Eval”</strong> to synthesize testing parameters.
        </p>
      </div>
    );
  }

  const handleFieldChange = (key: keyof Evaluation, value: any) => {
    onUpdate({
      ...evaluation,
      [key]: value,
    });
  };

  const handleCriteriaChange = (index: number, value: string) => {
    const updated = [...evaluation.evaluationCriteria];
    updated[index] = value;
    handleFieldChange("evaluationCriteria", updated);
  };

  const addCriteriaItem = () => {
    handleFieldChange("evaluationCriteria", [...evaluation.evaluationCriteria, ""]);
  };

  const removeCriteriaItem = (index: number) => {
    const updated = evaluation.evaluationCriteria.filter((_, i) => i !== index);
    handleFieldChange("evaluationCriteria", updated);
  };

  const handleJsonTextChange = (text: string) => {
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      // Validate structure basic
      const requiredKeys: (keyof Evaluation)[] = [
        "failureCategory",
        "correctionType",
        "expectedBehavior",
        "evaluationCriteria",
        "verifierType",
        "confidenceScore",
      ];
      const missing = requiredKeys.filter((k) => !(k in parsed));
      if (missing.length > 0) {
        setJsonError(`Missing required properties: ${missing.join(", ")}`);
        return;
      }
      if (!Array.isArray(parsed.evaluationCriteria)) {
        setJsonError("'evaluationCriteria' must be an array of strings.");
        return;
      }
      setJsonError(null);
      onUpdate(parsed as Evaluation);
    } catch (err: any) {
      setJsonError(`Invalid JSON: ${err.message}`);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(evaluation, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(evaluation, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `eval_criteria_${evaluation.failureCategory.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Score color helper
  const getScoreColor = (score: number) => {
    if (score >= 80) return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100", accent: "bg-emerald-500" };
    if (score >= 50) return { bg: "bg-amber-50", text: "text-[#C85A32]", border: "border-amber-100", accent: "bg-[#C85A32]" };
    return { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-100", accent: "bg-rose-500" };
  };

  const scoreTheme = getScoreColor(evaluation.confidenceScore);
  const activeLabelMeta = evaluation.wildfbLabel ? WILDFB_LABEL_MAP[evaluation.wildfbLabel] : null;

  return (
    <div id="eval-panel" className="bg-white rounded-xl border border-[#EFE9DF] flex flex-col overflow-hidden">
      {/* Header and Control bar */}
      <div className="p-5 border-b border-[#EFE9DF] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FAF6F0]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#C85A32] text-white rounded-lg">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1A1A1A] font-serif">Evaluation Spec</h2>
            <p className="text-xs text-slate-500">Structured machine-readable testing criteria</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 bg-[#FAF6F0]/40 p-1 rounded-lg border border-[#EFE9DF] self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("form")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-all ${
              activeTab === "form"
                ? "bg-white text-[#C85A32] shadow-xs"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Interactive Form
          </button>
          <button
            onClick={() => setActiveTab("json")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-all ${
              activeTab === "json"
                ? "bg-white text-[#C85A32] shadow-xs"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Raw JSON Source
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="p-6 flex-1 min-h-[400px]">
        {activeTab === "form" ? (
          <div className="space-y-5 animate-fadeIn">
            {/* General Info Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Failure Category */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Failure Category</label>
                <input
                  type="text"
                  value={evaluation.failureCategory}
                  onChange={(e) => handleFieldChange("failureCategory", e.target.value)}
                  className="w-full text-xs text-slate-800 bg-[#FAF6F0]/20 border border-[#EFE9DF] rounded px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#C85A32] transition-all font-sans"
                  placeholder="e.g. Negative Constraint Violation"
                />
              </div>

              {/* Correction Type */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Correction Type</label>
                <input
                  type="text"
                  value={evaluation.correctionType}
                  onChange={(e) => handleFieldChange("correctionType", e.target.value)}
                  className="w-full text-xs text-slate-800 bg-[#FAF6F0]/20 border border-[#EFE9DF] rounded px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#C85A32] transition-all font-sans"
                  placeholder="e.g. Constraint Reinforcement"
                />
              </div>
            </div>

            {/* Expected Behavior */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expected Behavior</label>
              <textarea
                value={evaluation.expectedBehavior}
                onChange={(e) => handleFieldChange("expectedBehavior", e.target.value)}
                rows={3}
                className="w-full text-xs text-slate-800 bg-[#FAF6F0]/20 border border-[#EFE9DF] rounded px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#C85A32] transition-all font-sans leading-relaxed"
                placeholder="Describe what the correct behavior looks like..."
              />
            </div>

            {/* WildFB Classification Analysis Panel */}
            <div className="p-4 bg-[#FAF6F0]/40 border border-[#EFE9DF] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-[#C85A32]" />
                  <span className="text-xs font-bold text-slate-700">WildFB Taxonomy Label Classification</span>
                </div>
                {activeLabelMeta && (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border bg-white border-[#EFE9DF] ${activeLabelMeta.text}`}>
                    Level {evaluation.wildfbLabel}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Taxonomy Level</label>
                  <select
                    value={evaluation.wildfbLabel || ""}
                    onChange={(e) => handleFieldChange("wildfbLabel", e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full text-xs text-slate-700 bg-white border border-[#EFE9DF] rounded px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-[#C85A32]"
                  >
                    <option value="">-- No Label Assigned --</option>
                    <option value="1">Label 1: CLEARLY NEGATIVE</option>
                    <option value="2">Label 2: CORRECTION</option>
                    <option value="3">Label 3: POSITIVE ENGAGEMENT</option>
                    <option value="4">Label 4: CLEAR SATISFACTION</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Label Description</label>
                  <div className="text-xs text-slate-500 bg-white/50 px-2.5 py-2 rounded border border-[#EFE9DF] min-h-[34px] flex items-center">
                    {activeLabelMeta ? activeLabelMeta.desc : "None selected"}
                  </div>
                </div>
              </div>

              {evaluation.wildfbAnalysis && (
                <div className="bg-white/60 p-3 rounded border border-[#EFE9DF] space-y-1">
                  <span className="text-[10px] font-bold text-[#C85A32] uppercase tracking-wider block">Taxonomy Justification</span>
                  <p className="text-xs text-slate-600 leading-relaxed italic">
                    "{evaluation.wildfbAnalysis}"
                  </p>
                </div>
              )}
            </div>

            {/* Evaluation Criteria Checklist */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Testing Criteria Checklist</label>
                <button
                  onClick={addCriteriaItem}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#C85A32] hover:text-[#C85A32]/85 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Criteria
                </button>
              </div>

              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {evaluation.evaluationCriteria.map((criterion, idx) => (
                  <div key={idx} className="flex items-center gap-2 group">
                    <div className="flex items-center justify-center w-6 h-6 text-xs font-bold text-[#C85A32] bg-[#FAF6F0] border border-[#EFE9DF] rounded shrink-0">
                      {idx + 1}
                    </div>
                    <input
                      type="text"
                      value={criterion}
                      onChange={(e) => handleCriteriaChange(idx, e.target.value)}
                      className="flex-1 text-xs text-slate-700 bg-white border border-[#EFE9DF] rounded px-3.5 py-2 focus:outline-none focus:ring-1 focus:ring-[#C85A32] transition-all"
                      placeholder="e.g. Ensure the output does not contain St. Peter's Basilica."
                    />
                    <button
                      onClick={() => removeCriteriaItem(idx)}
                      disabled={evaluation.evaluationCriteria.length <= 1}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 rounded transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Verifier & Confidence Score Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Verifier Type Select */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recommended Verifier Type</label>
                <select
                  value={evaluation.verifierType}
                  onChange={(e) => handleFieldChange("verifierType", e.target.value)}
                  className="w-full text-xs text-slate-800 bg-white border border-[#EFE9DF] rounded px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#C85A32]"
                >
                  <option value="LLM-as-a-Judge">LLM-as-a-Judge (Prompt-driven Evaluation)</option>
                  <option value="Regex / Substring Match">Regex / Substring Match (Static assertions)</option>
                  <option value="AST Code Parser">AST Code Parser (Syntax trees checks)</option>
                  <option value="Python Execution/Unit Test">Python Execution / Unit Testing (Sandboxed running)</option>
                </select>
              </div>

              {/* Confidence Score Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Evaluation Confidence</label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border bg-[#FAF6F0] text-[#C85A32] border-[#EFE9DF]`}>
                    {evaluation.confidenceScore}%
                  </span>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={evaluation.confidenceScore}
                    onChange={(e) => handleFieldChange("confidenceScore", parseInt(e.target.value))}
                    className="flex-1 accent-[#C85A32] h-1 bg-slate-200 rounded appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 h-full flex flex-col">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span>Raw Validated JSON Structure</span>
              {jsonError ? (
                <span className="text-rose-500 flex items-center gap-1 text-[11px] bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                  <AlertTriangle className="w-3 h-3" /> {jsonError}
                </span>
              ) : (
                <span className="text-emerald-600 flex items-center gap-1 text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  <CheckCircle2 className="w-3 h-3" /> Perfectly Validated
                </span>
              )}
            </div>
            <textarea
              value={jsonText}
              onChange={(e) => handleJsonTextChange(e.target.value)}
              className="flex-1 w-full text-xs font-mono p-4 bg-slate-900 text-slate-100 rounded focus:outline-none focus:ring-1 focus:ring-[#C85A32] border border-slate-800 leading-relaxed resize-none min-h-[350px]"
              spellCheck={false}
            />
          </div>
        )}
      </div>

      {/* Footer / Sharing Action Row */}
      <div className="p-4 border-t border-[#EFE9DF] flex items-center justify-between bg-[#FAF6F0]">
        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C85A32]" />
          Config ready for pipeline injection
        </div>

        <div className="flex items-center gap-2">
          {/* Copy Button */}
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

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#1A1A1A] hover:bg-[#C85A32] text-white rounded transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Spec
          </button>
        </div>
      </div>
    </div>
  );
};
