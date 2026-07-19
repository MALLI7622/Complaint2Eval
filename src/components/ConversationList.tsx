import React from "react";
import { Conversation, WildFBLabelType } from "../types";
import { ArrowRight, Flame, ShieldAlert, Sparkles, AlertCircle, PlusCircle, CheckCircle, HelpCircle, Code, ListFilter, HelpCircle as Brain } from "lucide-react";

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  onNext: () => void;
  onAddCustom: () => void;
}

export const WILDFB_LABEL_MAP: Record<WildFBLabelType, { label: string; desc: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  1: {
    label: "L1: CLEARLY NEGATIVE",
    desc: "Rejection, strong dissatisfaction, or abandonment",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-100",
    icon: <ShieldAlert className="w-3.5 h-3.5" />
  },
  2: {
    label: "L2: CORRECTION",
    desc: "Error corrections or points out specific mistakes",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-100",
    icon: <Flame className="w-3.5 h-3.5" />
  },
  3: {
    label: "L3: POSITIVE ENGAGEMENT",
    desc: "Continues conversation with constructive prompts",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-100",
    icon: <Sparkles className="w-3.5 h-3.5" />
  },
  4: {
    label: "L4: CLEAR SATISFACTION",
    desc: "Thanks, praise, or clear model satisfaction",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-100",
    icon: <CheckCircle className="w-3.5 h-3.5" />
  }
};

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeId,
  onSelect,
  onNext,
}) => {
  // Sophisticated heuristic-based tag categorization based on content
  const getCategoryTag = (convo: Conversation) => {
    const textToAnalyze = (convo.originalRequest + " " + convo.badResponse).toLowerCase();

    // Check for code
    if (
      textToAnalyze.includes("```") ||
      textToAnalyze.includes("def ") ||
      textToAnalyze.includes("function") ||
      textToAnalyze.includes("import ") ||
      textToAnalyze.includes("const ") ||
      textToAnalyze.includes("class ") ||
      textToAnalyze.includes("html")
    ) {
      return { label: "Code & Syntax", bg: "bg-slate-100 text-slate-700 border-slate-200", icon: <Code className="w-3 h-3 inline mr-1" /> };
    }

    // Check for constraints
    if (
      textToAnalyze.includes("must not") ||
      textToAnalyze.includes("cannot") ||
      textToAnalyze.includes("never") ||
      textToAnalyze.includes("do not") ||
      textToAnalyze.includes("only") ||
      textToAnalyze.includes("except") ||
      textToAnalyze.includes("without")
    ) {
      return { label: "Negative Constraints", bg: "bg-indigo-50 text-indigo-700 border-indigo-100", icon: <ListFilter className="w-3 h-3 inline mr-1" /> };
    }

    // Check for logical reasoning or riddles
    if (
      textToAnalyze.includes("riddle") ||
      textToAnalyze.includes("solve") ||
      textToAnalyze.includes("calculate") ||
      textToAnalyze.includes("sheep") ||
      textToAnalyze.includes("math") ||
      textToAnalyze.includes("logic") ||
      textToAnalyze.includes("subtract")
    ) {
      return { label: "Reasoning & Logic", bg: "bg-teal-50 text-teal-700 border-teal-100", icon: <Brain className="w-3 h-3 inline mr-1" /> };
    }

    return { label: "General Instruction", bg: "bg-blue-50 text-blue-700 border-blue-100", icon: <Sparkles className="w-3 h-3 inline mr-1" /> };
  };

  return (
    <div id="conversation-list" className="space-y-6">
      {/* WildFB Interactive Taxonomy Guide */}
      <div className="bg-[#FAF6F0] border border-[#EFE9DF] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[9px] uppercase font-bold tracking-wider bg-[#EFE9DF] text-slate-700 px-2 py-0.5 rounded">
            Taxonomy Schema
          </span>
          <h4 className="text-xs font-bold text-[#1A1A1A] font-serif">
            THU-KEG/WildFB User Correction Classification Scheme
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(Object.keys(WILDFB_LABEL_MAP) as unknown as WildFBLabelType[]).map((keyNum) => {
            const item = WILDFB_LABEL_MAP[keyNum];
            return (
              <div key={keyNum} className={`p-3 rounded-lg border bg-white border-[#EFE9DF] flex flex-col justify-between hover:border-[#C85A32]/30 transition-all`}>
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  {item.icon}
                  <span className={item.text}>{item.label}</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight mt-1.5">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-sans">Select Dialogue Scenario</h3>
      </div>

      {conversations.length === 0 ? (
        <div className="bg-[#FAF6F0] border border-dashed border-[#EFE9DF] rounded-xl py-12 text-center">
          <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-600">No matching conversations found</p>
          <p className="text-[10px] text-slate-400 mt-1">Try resetting your search query or selecting a different label filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {conversations.map((convo) => {
            const isActive = convo.id === activeId;
            const tag = getCategoryTag(convo);
            const wildfbLevel = convo.wildfbLabel ? WILDFB_LABEL_MAP[convo.wildfbLabel] : null;

            return (
              <button
                key={convo.id}
                onClick={() => onSelect(convo.id)}
                className={`text-left p-5 rounded-xl border transition-all relative flex flex-col justify-between group ${
                  isActive
                    ? "bg-white border-[#C85A32] shadow-sm ring-1 ring-[#C85A32] animate-fadeIn"
                    : "bg-[#FAF6F0]/60 hover:bg-white border-[#EFE9DF] hover:border-slate-300 hover:shadow-xs"
                }`}
              >
                <div className="space-y-3.5 w-full">
                  <div className="flex flex-wrap gap-1.5 items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200/60`}>
                        {tag.icon}
                        {tag.label}
                      </span>
                      {wildfbLevel && (
                        <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border ${wildfbLevel.bg} ${wildfbLevel.text} ${wildfbLevel.border}`}>
                          L{convo.wildfbLabel}
                        </span>
                      )}
                    </div>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-[#C85A32] animate-pulse" />
                    )}
                  </div>

                  <h4 className={`text-sm font-bold tracking-tight leading-tight group-hover:text-[#C85A32] transition-colors line-clamp-1 ${
                    isActive ? "text-[#C85A32] font-serif text-[15px]" : "text-slate-800"
                  }`}>
                    {convo.title.replace(/^WildFB-\w+:\s*/, "").replace(/^LiveFB-\w+:\s*/, "")}
                  </h4>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {convo.originalRequest}
                  </p>
                </div>

                <div className="mt-4 pt-3.5 border-t border-[#EFE9DF] flex items-center justify-between text-[11px] text-slate-400 font-medium w-full">
                  <span className="font-mono text-[9px] text-slate-400">ID: {convo.id.substring(0, 10)}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all text-[#C85A32]" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Load Next Example Button */}
      {conversations.length > 0 && (
        <div className="flex justify-end pt-2">
          <button
            onClick={onNext}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1A1A] hover:bg-[#C85A32] text-[#FDFBF7] text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Load Next Example
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
