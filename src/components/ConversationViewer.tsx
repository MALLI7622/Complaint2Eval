import React, { useState } from "react";
import { Conversation, WildFBLabelType } from "../types";
import {
  Sparkles,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  Edit3,
  Tag,
  ChevronDown,
  ChevronUp,
  User,
  Bot,
  MessageCircle
} from "lucide-react";

interface ConversationViewerProps {
  activeConversation: Conversation;
  onChange: (updated: Conversation) => void;
  onReset: () => void;
  isCustomized: boolean;
}

export const ConversationViewer: React.FC<ConversationViewerProps> = ({
  activeConversation,
  onChange,
  onReset,
  isCustomized,
}) => {
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const handleFieldChange = (key: keyof Conversation, value: any) => {
    onChange({
      ...activeConversation,
      [key]: value,
    });
  };

  const hasHistory = activeConversation.history && activeConversation.history.length > 0;

  return (
    <div id="conversation-viewer" className="bg-white rounded-xl border border-[#EFE9DF] p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#EFE9DF] pb-4 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#FAF6F0] text-[#C85A32] rounded-lg border border-[#EFE9DF]">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1A1A1A] font-serif">Active Dialogue Workspace</h2>
            <p className="text-xs text-slate-500">Review or customize the complaint conversation below</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isCustomized && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 text-xs text-[#C85A32] hover:text-[#C85A32]/80 font-semibold px-2.5 py-1.5 rounded bg-[#FAF6F0] border border-[#EFE9DF] transition-colors cursor-pointer"
              title="Reset to original values"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Example
            </button>
          )}
        </div>
      </div>

      {/* WildFB Correction Level Selector */}
      <div className="p-4 bg-[#FAF6F0] border border-[#EFE9DF] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-slate-500" />
          <div className="text-xs">
            <span className="font-bold text-slate-700 block">WildFB Correction Label <span className="text-slate-400 font-normal text-[10px] ml-1">(Optional)</span></span>
            <span className="text-[10px] text-slate-500 block">How the user feedback behaves in the taxonomy</span>
          </div>
        </div>
        <select
          value={activeConversation.wildfbLabel || ""}
          onChange={(e) => handleFieldChange("wildfbLabel", e.target.value ? parseInt(e.target.value) as WildFBLabelType : undefined)}
          className="text-xs text-slate-700 bg-white border border-[#EFE9DF] rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#C85A32] cursor-pointer"
        >
          <option value="">-- No Label Assigned --</option>
          <option value="1">Label 1: CLEARLY NEGATIVE (Dissatisfaction/Rejection)</option>
          <option value="2">Label 2: CORRECTION (Specific fix or mistake detail)</option>
          <option value="3">Label 3: POSITIVE ENGAGEMENT (Constructive extension)</option>
          <option value="4">Label 4: CLEAR SATISFACTION (Praise or thanks)</option>
        </select>
      </div>

      {/* Interactive, Beautiful Multi-Turn Context Panel */}
      {hasHistory && (
        <div className="border border-[#EFE9DF] rounded-xl overflow-hidden bg-[#FAF6F0]/40">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full px-4 py-3 bg-[#FAF6F0] hover:bg-[#FAF6F0]/80 transition-all flex items-center justify-between text-xs font-semibold text-slate-600 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-slate-500" />
              <span className="font-serif text-slate-700">Dialogue Context History ({activeConversation.history!.length} preceding turns)</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-[#C85A32]">
              <span>{showHistory ? "Collapse" : "Expand Thread"}</span>
              {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </button>

          {showHistory && (
            <div className="p-4 space-y-4 max-h-[350px] overflow-y-auto bg-white border-t border-[#EFE9DF] scrollbar-thin">
              {activeConversation.history!.map((msg, idx) => {
                const isUser = msg.role === "user";
                return (
                  <div key={idx} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                    {!isUser && (
                      <div className="w-7 h-7 rounded bg-[#FAF6F0] border border-[#EFE9DF] flex items-center justify-center text-[#C85A32] shrink-0 self-start">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-lg px-4 py-2.5 text-xs leading-relaxed ${
                      isUser
                        ? "bg-[#C85A32] text-white rounded-br-none"
                        : "bg-[#FAF6F0]/50 border border-[#EFE9DF] text-slate-800 rounded-bl-none font-mono text-[11px]"
                    }`}>
                      <div className="font-bold text-[9px] uppercase tracking-wider mb-1 opacity-70">
                        {isUser ? "User Query" : "Assistant Response"}
                      </div>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {isUser && (
                      <div className="w-7 h-7 rounded bg-[#FAF6F0] border border-[#EFE9DF] flex items-center justify-center text-slate-700 shrink-0 self-start">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Editor textareas */}
      <div className="space-y-5">
        {/* Original User Request */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <span className="flex items-center gap-1.5 text-slate-700 font-serif normal-case font-bold">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Original User Request
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Edit3 className="w-3 h-3" /> Editable
            </span>
          </div>
          <div className="relative group">
            <textarea
              value={activeConversation.originalRequest}
              onChange={(e) => handleFieldChange("originalRequest", e.target.value)}
              rows={3}
              placeholder="Enter original user prompt..."
              className="w-full text-xs text-slate-700 bg-[#FAF6F0]/40 border border-[#EFE9DF] rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#C85A32] focus:bg-white transition-all resize-y leading-relaxed font-sans"
            />
          </div>
        </div>

        {/* Assistant's Bad Response */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <span className="flex items-center gap-1.5 text-[#C85A32] font-serif normal-case font-bold">
              <span className="w-2 h-2 rounded-full bg-[#C85A32]" />
              Assistant’s Flawed Response
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Edit3 className="w-3 h-3" /> Editable
            </span>
          </div>
          <div className="relative group">
            <textarea
              value={activeConversation.badResponse}
              onChange={(e) => handleFieldChange("badResponse", e.target.value)}
              rows={4}
              placeholder="Paste or write the assistant's incorrect response here..."
              className="w-full text-xs text-slate-700 bg-[#FAF6F0]/40 border border-[#EFE9DF] rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#C85A32] focus:bg-white transition-all resize-y leading-relaxed font-mono"
            />
          </div>
        </div>

        {/* User's Correction / Complaint */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <span className="flex items-center gap-1.5 text-slate-700 font-serif normal-case font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              User’s Complaint / Correction
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Edit3 className="w-3 h-3" /> Editable
            </span>
          </div>
          <div className="relative group">
            <textarea
              value={activeConversation.userCorrection}
              onChange={(e) => handleFieldChange("userCorrection", e.target.value)}
              rows={3}
              placeholder="Enter the user's corrective comment or complaint..."
              className="w-full text-xs text-slate-700 bg-[#FAF6F0]/40 border border-[#EFE9DF] rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#C85A32] focus:bg-white transition-all resize-y leading-relaxed font-sans"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
