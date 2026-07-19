import React, { useState, useEffect } from "react";
import { Conversation, Evaluation, WildFBLabelType, EvalSuite, TrajectoryStep } from "./types";
import { SAMPLE_CONVERSATIONS } from "./data";
import { ConversationList } from "./components/ConversationList";
import { ConversationViewer } from "./components/ConversationViewer";
import { EvalPanel } from "./components/EvalPanel";
import { SuitePanel } from "./components/SuitePanel";
import { TrajectoryViewer } from "./components/TrajectoryViewer";
import { initAuth, googleSignIn, logout } from "./firebase";
import { exportProjectSpecToGoogleDoc } from "./utils/docsExporter";
import {
  Sparkles,
  Terminal,
  ShieldAlert,
  CheckCircle,
  HelpCircle,
  FileJson,
  Cpu,
  Search,
  Database,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  PlusCircle,
  Flame,
  ArrowRight,
  Save,
  Award,
  Layers,
  Sparkle,
  ArrowUpRight,
  Check,
  ChevronDown
} from "lucide-react";

export default function App() {
  // Navigation Router: "landing" | "demo"
  const [activeView, setActiveView] = useState<"landing" | "demo">("landing");

  // Primary datasets
  const [localRows, setLocalRows] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [evalResult, setEvalResult] = useState<Evaluation | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Suite generation states
  const [suiteResult, setSuiteResult] = useState<EvalSuite | null>(null);
  const [isGeneratingSuite, setIsGeneratingSuite] = useState<boolean>(false);
  const [activePanelTab, setActivePanelTab] = useState<"single" | "trajectory" | "suite">("single");

  // Sync state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Google Docs Workspace Integration states
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [isExportingDoc, setIsExportingDoc] = useState<boolean>(false);
  const [exportedDocResult, setExportedDocResult] = useState<{ title: string; url: string; id: string } | null>(null);
  const [docExportError, setDocExportError] = useState<string | null>(null);

  // Initialize Auth state on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleAccessToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleAccessToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const handleGoogleLogin = async () => {
    setDocExportError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleAccessToken(res.accessToken);
      }
    } catch (err: any) {
      console.error("Google login failed", err);
      setDocExportError(err.message || "Google Authentication failed.");
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logout();
      setGoogleUser(null);
      setGoogleAccessToken(null);
      setExportedDocResult(null);
    } catch (err: any) {
      console.error("Google logout failed", err);
    }
  };

  const handleExportToGoogleDoc = async () => {
    if (!googleAccessToken) {
      setDocExportError("You must be signed in with Google to export to Google Docs.");
      return;
    }

    // Explicit user confirmation for creating/writing to documents (as mandated by Least Privilege / Workspace guidelines)
    const confirmed = window.confirm(
      "Create a new Google Document in your Google Drive with the detailed Complaint2Eval project specification?"
    );
    if (!confirmed) return;

    setIsExportingDoc(true);
    setDocExportError(null);
    setExportedDocResult(null);

    try {
      const result = await exportProjectSpecToGoogleDoc(googleAccessToken);
      setExportedDocResult({
        title: result.title,
        url: result.documentUrl,
        id: result.documentId,
      });
    } catch (err: any) {
      console.error("Failed to export project spec to Google Doc", err);
      setDocExportError(err.message || "An error occurred while creating or writing the Google Document.");
    } finally {
      setIsExportingDoc(false);
    }
  };

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterLabel, setFilterLabel] = useState<string>("all");
  const [datasetSource, setDatasetSource] = useState<"cached" | "live">("cached");

  // Loading states
  const [isLoadingDataset, setIsLoadingDataset] = useState<boolean>(true);
  const [isFetchingRemote, setIsFetchingRemote] = useState<boolean>(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 6;

  // Storing original unedited copies to support "Reset Example"
  const [originalMap, setOriginalMap] = useState<Record<string, Conversation>>({});

  // Fetch local cached WildFB rows on mount
  useEffect(() => {
    async function loadLocalDataset() {
      setIsLoadingDataset(true);
      setErrorMsg(null);
      try {
        const res = await fetch("/api/wildfb/local");
        if (!res.ok) throw new Error("Server failed to return local cached dataset.");
        const data = await res.json();

        if (data.rows && data.rows.length > 0) {
          // Normalize the Hugging Face schema to our Conversation interface
          const mapped: Conversation[] = data.rows.map((row: any) => {
            const shortPrompt = row.prompt.substring(0, 45) + (row.prompt.length > 45 ? "..." : "");
            return {
              id: row.id,
              title: `WildFB-${row.id.substring(0, 5)}: ${shortPrompt}`,
              originalRequest: row.prompt,
              badResponse: row.response,
              userCorrection: row.feedback,
              wildfbLabel: row.label as WildFBLabelType,
              history: row.history
            };
          });

          setLocalRows(mapped);

          // Map original values for reset functionality
          const origs: Record<string, Conversation> = {};
          mapped.forEach((c) => {
            origs[c.id] = { ...c };
          });
          setOriginalMap(origs);

          if (mapped.length > 0) {
            setActiveId(mapped[0].id);
          }
        } else {
          // Fallback to static sample if database is empty
          loadFallbackSamples();
        }
      } catch (err: any) {
        console.error("Failed to fetch local dataset, falling back to samples:", err);
        loadFallbackSamples();
      } finally {
        setIsLoadingDataset(false);
      }
    }

    loadLocalDataset();
  }, []);

  const loadFallbackSamples = () => {
    const fallback = [...SAMPLE_CONVERSATIONS];
    setLocalRows(fallback);
    const origs: Record<string, Conversation> = {};
    fallback.forEach((c) => {
      origs[c.id] = { ...c };
    });
    setOriginalMap(origs);
    setActiveId(fallback[0].id);
  };

  // Live remote streaming from Hugging Face
  const handleFetchRemoteBatch = async () => {
    setIsFetchingRemote(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/wildfb/remote?limit=10");
      if (!res.ok) throw new Error("Hugging Face live fetch failed or timed out.");
      const data = await res.json();

      if (data.rows && data.rows.length > 0) {
        const mapped: Conversation[] = data.rows.map((row: any) => {
          const shortPrompt = row.prompt.substring(0, 45) + (row.prompt.length > 45 ? "..." : "");
          return {
            id: `live-${row.id}`,
            title: `LiveFB-${row.id.substring(0, 5)}: ${shortPrompt}`,
            originalRequest: row.prompt,
            badResponse: row.response,
            userCorrection: row.feedback,
            wildfbLabel: row.label as WildFBLabelType,
            history: row.history
          };
        });

        // Prepend new live items to local rows state
        setLocalRows((prev) => {
          const updated = [...mapped, ...prev];
          // Register original states for reset
          const nextOrig = { ...originalMap };
          mapped.forEach((c) => {
            nextOrig[c.id] = { ...c };
          });
          setOriginalMap(nextOrig);
          return updated;
        });

        setDatasetSource("live");
        setHasUnsavedChanges(true); // Newly imported remote rows are unsaved until synced
        setActiveId(mapped[0].id);
        setCurrentPage(1); // Go back to page 1 to see the new items
        setEvalResult(null);

        // Temporarily reset search and filters to let user see live results
        setSearchTerm("");
        setFilterLabel("all");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Could not retrieve live stream from Hugging Face. CDN might be heavily loaded. Please try again.");
    } finally {
      setIsFetchingRemote(false);
    }
  };

  // Filter & Search computation
  const filteredConversations = localRows.filter((convo) => {
    const matchesSearch =
      convo.originalRequest.toLowerCase().includes(searchTerm.toLowerCase()) ||
      convo.badResponse.toLowerCase().includes(searchTerm.toLowerCase()) ||
      convo.userCorrection.toLowerCase().includes(searchTerm.toLowerCase()) ||
      convo.title.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLabel =
      filterLabel === "all" || convo.wildfbLabel?.toString() === filterLabel;

    return matchesSearch && matchesLabel;
  });

  // Reset pagination when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterLabel]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredConversations.length / ITEMS_PER_PAGE) || 1;
  const paginatedConversations = filteredConversations.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Active item lookup
  const activeConversation = localRows.find((c) => c.id === activeId) || localRows[0];

  // Check if modified
  const original = originalMap[activeId];
  const isCustomized = original
    ? activeConversation.originalRequest !== original.originalRequest ||
      activeConversation.badResponse !== original.badResponse ||
      activeConversation.userCorrection !== original.userCorrection ||
      activeConversation.wildfbLabel !== original.wildfbLabel
    : false;

  const handleConversationChange = (updated: Conversation) => {
    setLocalRows((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setHasUnsavedChanges(true); // Flag that there are unsaved edits
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/wildfb/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ rows: localRows })
      });
      if (!res.ok) throw new Error("Sync failed on the server.");
      const data = await res.json();
      setHasUnsavedChanges(false);
      setSyncMessage(data.message || "All dataset records successfully synchronized and saved to local database!");
      setTimeout(() => setSyncMessage(null), 6000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to synchronize database: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReset = () => {
    if (!original) return;
    setLocalRows((prev) =>
      prev.map((c) => (c.id === activeId ? { ...original } : c))
    );
  };

  const handleSelectConversation = (id: string) => {
    setActiveId(id);
    setEvalResult(null);
    setErrorMsg(null);
  };

  const handleLoadNext = () => {
    const currentIndex = filteredConversations.findIndex((c) => c.id === activeId);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % filteredConversations.length;
    const nextConvo = filteredConversations[nextIndex];
    setActiveId(nextConvo.id);

    // Jump to the correct page of the next conversation if it's on a different page
    const nextPage = Math.floor(nextIndex / ITEMS_PER_PAGE) + 1;
    setCurrentPage(nextPage);

    setEvalResult(null);
    setErrorMsg(null);
  };

  const handleAddCustom = () => {
    const customId = `custom-${Date.now()}`;
    const newCustom: Conversation = {
      id: customId,
      title: `Scratchpad #${localRows.filter(r => r.id.startsWith("custom")).length + 1}`,
      originalRequest: "Write a short user instruction request here...",
      badResponse: "Paste an incorrect response that violated instructions or criteria here...",
      userCorrection: "Explain what was wrong and how it should be corrected...",
      wildfbLabel: 2,
    };
    setLocalRows((prev) => [newCustom, ...prev]);
    setOriginalMap((prev) => ({ ...prev, [customId]: { ...newCustom } }));
    setActiveId(customId);
    setCurrentPage(1);
    setEvalResult(null);
    setErrorMsg(null);
    setHasUnsavedChanges(true); // Flag that there are unsaved custom changes
  };

  // Post to Gemini evaluator endpoint
  const handleGenerateEval = async () => {
    if (!activeConversation) return;
    setLoading(true);
    setErrorMsg(null);
    setEvalResult(null);

    try {
      const response = await fetch("/api/generate-eval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalRequest: activeConversation.originalRequest,
          badResponse: activeConversation.badResponse,
          userCorrection: activeConversation.userCorrection,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "An unexpected response was returned by the server.");
      }

      setEvalResult(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to contact the evaluation server.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSuite = async () => {
    if (filteredConversations.length === 0) return;
    setIsGeneratingSuite(true);
    setErrorMsg(null);
    setSuiteResult(null);
    setActivePanelTab("suite");

    // Automatically select the first filtered conversation if none is active
    // to instantly render and reveal the two-column workspace containing the SuitePanel!
    if (!activeId) {
      handleSelectConversation(filteredConversations[0].id);
    }

    try {
      // Send up to 15 filtered rows
      const targetRows = filteredConversations.slice(0, 15).map(c => ({
        id: c.id,
        originalRequest: c.originalRequest,
        badResponse: c.badResponse,
        userCorrection: c.userCorrection,
        wildfbLabel: c.wildfbLabel
      }));

      const res = await fetch("/api/generate-suite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ rows: targetRows })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "An unexpected error occurred during suite generation.");
      setSuiteResult(data.suite);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to compile evaluation suite with Gemini.");
    } finally {
      setIsGeneratingSuite(false);
    }
  };

  // Trajectory Trace generation helper callback using /api/generate-trajectory
  const handleGenerateTrajectory = async (): Promise<TrajectoryStep[]> => {
    if (!activeConversation) return [];

    const response = await fetch("/api/generate-trajectory", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        originalRequest: activeConversation.originalRequest,
        badResponse: activeConversation.badResponse,
        userCorrection: activeConversation.userCorrection,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "An unexpected error occurred during trajectory generation.");
    }

    return data.steps;
  };

  // Navigation action handlers supporting smooth scrolling within landing page
  const handleNavClick = (sectionId: string) => {
    if (activeView !== "landing") {
      setActiveView("landing");
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1A1A1A] font-sans antialiased selection:bg-[#C85A32]/10 selection:text-[#C85A32]">
      {/* Editorial Navbar */}
      <nav className="sticky top-0 z-50 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-[#EFE9DF]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveView("landing")}>
            <span className="font-serif text-lg font-bold tracking-tight text-[#1A1A1A]">
              Complaint<span className="text-[#C85A32]">2</span>Eval
            </span>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8 text-xs font-semibold tracking-wide uppercase text-slate-500">
            <button
              onClick={() => handleNavClick("how-it-works")}
              className="hover:text-[#1A1A1A] transition-colors"
            >
              How it works
            </button>
            <button
              onClick={() => handleNavClick("use-cases")}
              className="hover:text-[#1A1A1A] transition-colors"
            >
              Use cases
            </button>
            <button
              onClick={() => setActiveView("demo")}
              className={`hover:text-[#1A1A1A] transition-colors ${
                activeView === "demo" ? "text-[#C85A32] font-bold" : ""
              }`}
            >
              Interactive Demo
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView("demo")}
              className="text-xs font-bold tracking-wider uppercase bg-[#1A1A1A] hover:bg-[#C85A32] text-white px-4 py-2.5 rounded transition-all duration-200"
            >
              Try the demo
            </button>
          </div>
        </div>
      </nav>

      {activeView === "landing" ? (
        <div className="animate-fadeIn">
          {/* Hero Section */}
          <section className="relative pt-20 pb-24 md:pt-28 md:pb-32 border-b border-[#EFE9DF] overflow-hidden">
            <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FAF6F0] border border-[#EFE9DF] rounded text-[11px] font-bold tracking-widest text-[#C85A32] uppercase">
                <Sparkle className="w-3.5 h-3.5 fill-[#C85A32]" /> Offline-First Evaluation Pipeline
              </div>
              <h1 className="text-4xl md:text-6xl font-serif font-bold text-[#1A1A1A] tracking-tight leading-[1.1] max-w-3xl mx-auto">
                Turn user complaints into regression tests for AI.
              </h1>
              <p className="text-base md:text-lg text-slate-500 max-w-xl mx-auto leading-relaxed font-serif italic">
                Complaint2Eval converts real user complaints, traces, and thumbs-downs into structured, version-controlled evaluation suites and grading rubrics. Automatically.
              </p>

              <div className="pt-4 flex flex-wrap justify-center gap-4">
                <button
                  onClick={() => setActiveView("demo")}
                  className="px-6 py-3.5 text-xs font-bold tracking-wider uppercase bg-[#C85A32] hover:bg-[#1A1A1A] text-white rounded transition-colors duration-200 flex items-center gap-2 shadow-xs"
                >
                  Launch Interactive Workspace <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleNavClick("how-it-works")}
                  className="px-6 py-3.5 text-xs font-bold tracking-wider uppercase border border-[#EFE9DF] bg-white hover:bg-[#FAF6F0] text-[#1A1A1A] rounded transition-colors"
                >
                  See How It Works
                </button>
              </div>
            </div>

            {/* Visual Pipeline Showcase */}
            <div className="max-w-5xl mx-auto px-6 mt-16 md:mt-24">
              <div className="bg-white rounded-xl border border-[#EFE9DF] p-6 md:p-8 shadow-xs">
                <div className="flex items-center justify-between border-b border-[#EFE9DF] pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C85A32]" />
                    <span className="text-[11px] font-mono uppercase font-bold text-[#1A1A1A]">Complaint-to-Eval Pipeline in Action</span>
                  </div>
                  <span className="text-[10px] bg-[#FAF6F0] border border-[#EFE9DF] px-2.5 py-0.5 rounded font-mono text-slate-400">
                    TRANSFORMATION SCHEME
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                  {/* Step 1 Box */}
                  <div className="bg-[#FAF6F0]/60 p-5 rounded border border-[#EFE9DF]/80 space-y-3 relative">
                    <div className="absolute -top-3 left-4 bg-white px-2.5 py-0.5 border border-[#EFE9DF] rounded text-[10px] font-bold text-[#C85A32]">
                      01. Complaint
                    </div>
                    <div className="pt-2 font-mono text-[11px] text-slate-400 space-y-2">
                      <span className="text-[#C85A32] font-semibold block uppercase text-[9px]">Raw User Feedback:</span>
                      <p className="text-[#1A1A1A] bg-white p-2.5 rounded border border-[#EFE9DF]/60 leading-relaxed italic">
                        "Your coding assistant generated a list of imports containing duplicate lines instead of compacting them."
                      </p>
                    </div>
                  </div>

                  {/* Step 2 Box */}
                  <div className="bg-[#FAF6F0]/60 p-5 rounded border border-[#EFE9DF]/80 space-y-3 relative">
                    <div className="absolute -top-3 left-4 bg-white px-2.5 py-0.5 border border-[#EFE9DF] rounded text-[10px] font-bold text-[#C85A32]">
                      02. Gemini Cluster
                    </div>
                    <div className="pt-2 font-mono text-[11px] text-slate-400 space-y-2">
                      <span className="text-[#C85A32] font-semibold block uppercase text-[9px]">Cluster Identification:</span>
                      <div className="bg-white p-2.5 rounded border border-[#EFE9DF]/60 space-y-1.5">
                        <strong className="text-[#1A1A1A] text-[10px] block font-serif uppercase">Import Redundancy Failures</strong>
                        <p className="text-slate-500 text-[10px] leading-relaxed">
                          Grouping complaints regarding redundant import generation and missing formatter sweeps.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 Box */}
                  <div className="bg-[#FAF6F0]/60 p-5 rounded border border-[#EFE9DF]/80 space-y-3 relative">
                    <div className="absolute -top-3 left-4 bg-white px-2.5 py-0.5 border border-[#EFE9DF] rounded text-[10px] font-bold text-[#C85A32]">
                      03. Eval Synthesis
                    </div>
                    <div className="pt-2 font-mono text-[11px] text-slate-400 space-y-2">
                      <span className="text-[#C85A32] font-semibold block uppercase text-[9px]">Synthesized Rubric:</span>
                      <div className="bg-white p-2.5 rounded border border-[#EFE9DF]/60 space-y-1.5">
                        <p className="text-[#1A1A1A] text-[10px] leading-relaxed">
                          <strong>Criteria:</strong> Ensure imports are grouped. No line should contain duplicate packages.
                        </p>
                        <p className="text-emerald-600 text-[10px]">
                          <strong>Scorecard:</strong> 1 = Deduplicated, 0 = Redundancies
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Problem Section */}
          <section className="py-20 md:py-28 border-b border-[#EFE9DF] bg-[#FAF6F0]/30">
            <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7 space-y-4">
                <span className="text-[10px] font-bold tracking-widest text-[#C85A32] uppercase">The Core Problem</span>
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#1A1A1A] tracking-tight">
                  Your users already found your bugs. We turn them into your benchmark.
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Traditional LLM testing relies on artificial synthetics or hand-written prompt benchmarks. Meanwhile, real-world edge cases are continuously flagged by your actual users—but they are buried in logs, thumbs-down responses, or customer support channels.
                </p>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Translating thousands of loose complaints into rigorous, executable, reproducible test scripts with precise grading guidelines used to take days of manual prompt-engineering. Not anymore.
                </p>
              </div>
              <div className="md:col-span-5 bg-white p-6 rounded-xl border border-[#EFE9DF] space-y-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-rose-500">The Friction Gap</span>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-400 w-[85%]" />
                  </div>
                </div>
                <div className="space-y-3 text-xs text-slate-600 font-mono">
                  <div className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                    <span>85% of production failures are reported via user feedback but never added to standard test suites.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                    <span>Manual transcription into evaluations takes 30-45 minutes per prompt.</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works Section */}
          <section id="how-it-works" className="py-20 md:py-28 border-b border-[#EFE9DF]">
            <div className="max-w-4xl mx-auto px-6 space-y-16">
              <div className="text-center space-y-4">
                <span className="text-[10px] font-bold tracking-widest text-[#C85A32] uppercase">Core Architecture</span>
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#1A1A1A] tracking-tight">
                  How Complaint2Eval Automates Benchmarking
                </h2>
                <p className="text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
                  We bridge the gap between unstructured feedback channels and developer-centric testing suites.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Step 1 */}
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded bg-[#FAF6F0] border border-[#EFE9DF] flex items-center justify-center text-sm font-bold text-[#C85A32] font-serif">
                    1
                  </div>
                  <h3 className="font-serif font-bold text-[#1A1A1A] text-lg">Stream & Ingest</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Connect real-world datasets, log repositories, or live user complaints. Our pipeline supports raw text feedbacks, conversation histories, and correction labels seamlessly.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded bg-[#FAF6F0] border border-[#EFE9DF] flex items-center justify-center text-sm font-bold text-[#C85A32] font-serif">
                    2
                  </div>
                  <h3 className="font-serif font-bold text-[#1A1A1A] text-lg">Cluster Failures</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Gemini analyzes negative feedback items, identifies repeating patterns, and groups them automatically into highly cohesive failure modes or clusters.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded bg-[#FAF6F0] border border-[#EFE9DF] flex items-center justify-center text-sm font-bold text-[#C85A32] font-serif">
                    3
                  </div>
                  <h3 className="font-serif font-bold text-[#1A1A1A] text-lg">Synthesize Rubrics</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Automatically compile distinct evaluation test prompts, target behaviors, and multi-point grading rubrics formatted in clean JSON, ready for CI/CD ingestion.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Use Cases Section */}
          <section id="use-cases" className="py-20 md:py-28 border-b border-[#EFE9DF] bg-[#FAF6F0]/30">
            <div className="max-w-4xl mx-auto px-6 space-y-12">
              <div className="text-center space-y-4">
                <span className="text-[10px] font-bold tracking-widest text-[#C85A32] uppercase">Practical Applications</span>
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#1A1A1A] tracking-tight">
                  Engineered For Production AI Teams
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl border border-[#EFE9DF] space-y-3">
                  <div className="w-8 h-8 rounded bg-[#FAF6F0] text-[#C85A32] flex items-center justify-center">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <h4 className="font-serif font-bold text-base text-[#1A1A1A]">Prevent Prompt & Agent Regressions</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Every time you update your agent workflow, system prompts, or model endpoints, execute your pattern-mined complaint suite to verify you haven't introduced regressions.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-[#EFE9DF] space-y-3">
                  <div className="w-8 h-8 rounded bg-[#FAF6F0] text-[#C85A32] flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </div>
                  <h4 className="font-serif font-bold text-base text-[#1A1A1A]">Verify Model Upgrades Safely</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Curated benchmarks prove how a model swap (e.g. migrating from 1.5 Pro to 2.0 Flash) will handle the specific conversational paths where your previous model stumbled.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-[#EFE9DF] space-y-3">
                  <div className="w-8 h-8 rounded bg-[#FAF6F0] text-[#C85A32] flex items-center justify-center">
                    <Database className="w-4 h-4" />
                  </div>
                  <h4 className="font-serif font-bold text-base text-[#1A1A1A]">Harness Public Human Datasets</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Utilize large scale public feedback datasets (such as the WildFB annotation corpus with 186K samples) to immediately bootstrap evaluation setups.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-[#EFE9DF] space-y-3">
                  <div className="w-8 h-8 rounded bg-[#FAF6F0] text-[#C85A32] flex items-center justify-center">
                    <Save className="w-4 h-4" />
                  </div>
                  <h4 className="font-serif font-bold text-base text-[#1A1A1A]">Streamlined CI/CD Ingestion</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Download clustered test suites instantly in standardized JSON formats. Automate test-run executions using standard GitHub Actions or custom runner frameworks.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="py-20 md:py-24 text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#1A1A1A] tracking-tight">
              Ready to explore your users' real benchmarks?
            </h2>
            <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
              Explore our interactive sandbox workspace with real WildFB dataset records and synthesized evaluations.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setActiveView("demo")}
                className="px-8 py-4 text-xs font-bold tracking-wider uppercase bg-[#1A1A1A] hover:bg-[#C85A32] text-white rounded transition-colors duration-200"
              >
                Launch Interactive Demo
              </button>
            </div>
          </section>
        </div>
      ) : (
        /* Demo Interactive Workspace View */
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 animate-fadeIn">

          {/* Important Product Positioning Banner */}
          <div className="bg-[#FAF6F0] rounded-xl border border-[#EFE9DF] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#C85A32] uppercase tracking-wider block">Product Positioning Notice</span>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>Complaint2Eval</strong> is the primary system. We are demonstrating this product using real public samples from the <strong>WildFB</strong> user-correction dataset as a primary example.
              </p>
            </div>
            <button
              onClick={() => setActiveView("landing")}
              className="text-[10px] font-bold uppercase tracking-wider text-[#C85A32] hover:text-[#1A1A1A] border-b border-transparent hover:border-[#1A1A1A] pb-0.5 transition-all self-start sm:self-auto shrink-0"
            >
              Back to Landing Page
            </button>
          </div>

          {/* Google Docs Project Documentation Export Panel */}
          <div className="bg-white rounded-xl border border-[#EFE9DF] p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EFE9DF] pb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#FAF6F0] text-[#C85A32] rounded-lg">
                  <PlusCircle className="w-5 h-5 text-[#C85A32]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-wide text-[#1A1A1A] uppercase font-serif">Google Workspace Integration</h3>
                  <p className="text-xs text-slate-400">Export the comprehensive project specification directly to a Google Document</p>
                </div>
              </div>

              {googleUser ? (
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-500 font-medium">
                    Connected: <strong className="text-slate-800 font-semibold">{googleUser.email}</strong>
                  </span>
                  <button
                    onClick={handleGoogleLogout}
                    className="text-[11px] font-semibold text-[#C85A32] hover:text-[#1A1A1A] transition-colors border-b border-[#C85A32]/40 hover:border-[#1A1A1A]/40"
                  >
                    Disconnect
                  </button>
                </div>
              ) : null}
            </div>

            {googleUser ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                  Your Google Workspace is connected. Click the button below to synthesize and export a detailed 3/4-page
                  technical specification document covering the <strong>Complaint2Eval</strong> platform,
                  the <strong>WildFB</strong> failure taxonomy, trajectory diagnostics, and evaluation suite compilation.
                </p>

                <div className="flex flex-wrap items-center gap-4">
                  <button
                    onClick={handleExportToGoogleDoc}
                    disabled={isExportingDoc}
                    className={`flex items-center gap-2 text-xs font-bold tracking-wider uppercase px-5 py-3 rounded transition-all duration-200 border ${
                      isExportingDoc
                        ? "bg-[#FAF6F0] text-slate-400 border-[#EFE9DF] cursor-not-allowed"
                        : "bg-[#1A1A1A] hover:bg-[#C85A32] text-white border-[#1A1A1A]"
                    }`}
                  >
                    {isExportingDoc ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                        Writing Document to Drive...
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4" />
                        Export Project Spec to Google Doc
                      </>
                    )}
                  </button>
                </div>

                {exportedDocResult && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex gap-3 text-slate-700 animate-fadeIn mt-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-semibold text-slate-900 text-xs">Document Generated Successfully!</h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        A formatted document titled <strong className="text-slate-800">"{exportedDocResult.title}"</strong> has been created in your Google Drive.
                      </p>
                      <a
                        href={exportedDocResult.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C85A32] hover:text-[#1A1A1A] transition-colors mt-1 border-b border-[#C85A32]/40"
                      >
                        Open document in Google Docs <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                  Enable Google Docs and Google Drive connection to create, format, and save the project specification
                  directly to your account.
                </p>

                {/* Google Sign-in Button with compliance */}
                <button
                  onClick={handleGoogleLogin}
                  className="inline-flex items-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 rounded px-4 py-2.5 shadow-xs transition-all duration-200 active:scale-98"
                >
                  <svg className="w-4 h-4 shrink-0" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              </div>
            )}

            {docExportError && (
              <div className="bg-rose-50 border border-rose-100 rounded-lg p-4 flex gap-3 text-slate-700 animate-fadeIn mt-2 text-xs">
                <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
                <div>
                  <h5 className="font-semibold text-slate-900">Workspace Integration Alert</h5>
                  <p className="text-[11px] text-rose-800 mt-0.5">{docExportError}</p>
                </div>
              </div>
            )}
          </div>

          {/* Dataset Control & Selection Panel */}
          <section className="bg-white rounded-xl border border-[#EFE9DF] p-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EFE9DF] pb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#FAF6F0] text-[#C85A32] rounded-lg">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-wide text-[#1A1A1A] uppercase font-serif">Dataset Explorer Workspace</h2>
                  <p className="text-xs text-slate-400">Search and filter rows imported directly from Hugging Face</p>
                </div>
              </div>

              {/* Direct action to fetch remote */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleFetchRemoteBatch}
                  disabled={isFetchingRemote}
                  className={`text-xs font-semibold px-4 py-2.5 rounded border flex items-center gap-2 transition-all duration-200 ${
                    isFetchingRemote
                      ? "bg-[#FAF6F0] text-slate-400 border-[#EFE9DF] cursor-not-allowed"
                      : "bg-[#FAF6F0] text-[#C85A32] border-[#EFE9DF] hover:bg-[#FAF6F0]/80"
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingRemote ? "animate-spin" : ""}`} />
                  {isFetchingRemote ? "Streaming from HF CDN..." : "⚡ Fetch Live HF Batch"}
                </button>

                <button
                  onClick={handleAddCustom}
                  className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-[#EFE9DF] font-semibold px-4 py-2.5 rounded transition-colors"
                >
                  <PlusCircle className="w-4 h-4 text-slate-500" />
                  New Scratchpad
                </button>

                <button
                  onClick={handleSyncAll}
                  disabled={isSyncing}
                  title={hasUnsavedChanges ? "You have unsaved changes. Sync them now to write back to the local database file." : "All changes are saved and synced to the database."}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded transition-all duration-200 border ${
                    hasUnsavedChanges
                      ? "bg-[#C85A32] hover:bg-[#1A1A1A] text-white border-[#C85A32] animate-pulse"
                      : "bg-[#1A1A1A] hover:bg-[#C85A32] text-white border-[#1A1A1A]"
                  } ${isSyncing ? "opacity-75 cursor-wait" : ""}`}
                >
                  <Save className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Syncing..." : hasUnsavedChanges ? "💾 Sync to Database" : "✓ Saved & Synced"}
                </button>
              </div>
            </div>

            {/* Search, Filters and Status Line */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#FAF6F0]/40 p-4 rounded-lg border border-[#EFE9DF]">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-7 relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search prompt, model response, correction comments or ID..."
                    className="w-full text-xs text-slate-700 bg-white border border-[#EFE9DF] rounded pl-10 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#C85A32] focus:border-[#C85A32] transition-all"
                  />
                </div>

                <div className="md:col-span-5 flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 shrink-0">Filter Label:</span>
                  <select
                    value={filterLabel}
                    onChange={(e) => setFilterLabel(e.target.value)}
                    className="w-full text-xs text-slate-700 bg-white border border-[#EFE9DF] rounded px-3 py-3 focus:outline-none focus:ring-1 focus:ring-[#C85A32]"
                  >
                    <option value="all">All Levels (Show All)</option>
                    <option value="1">Label 1: CLEARLY NEGATIVE</option>
                    <option value="2">Label 2: CORRECTION</option>
                    <option value="3">Label 3: POSITIVE ENGAGEMENT</option>
                    <option value="4">Label 4: CLEAR SATISFACTION</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  onClick={handleGenerateSuite}
                  disabled={isGeneratingSuite || filteredConversations.length === 0}
                  className={`flex items-center gap-2 px-5 py-3 rounded font-bold text-xs transition-all ${
                    isGeneratingSuite
                      ? "bg-[#FAF6F0] text-slate-400 border border-[#EFE9DF] cursor-not-allowed"
                      : "bg-[#C85A32] hover:bg-[#1A1A1A] text-white shadow-xs"
                  }`}
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isGeneratingSuite ? "animate-spin" : "animate-pulse text-amber-200"}`} />
                  {isGeneratingSuite ? "Mining Patterns..." : "Generate Eval Suite from Filtered Set"}
                </button>

                <span className="text-[11px] font-semibold text-slate-500 bg-white border border-[#EFE9DF] px-3.5 py-3 rounded">
                  {filteredConversations.length} rows
                </span>
              </div>
            </div>

            {isLoadingDataset ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-8 h-8 border-3 border-[#C85A32] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-medium text-slate-400 animate-pulse">Initializing real-world WildFB dataset...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <ConversationList
                  conversations={paginatedConversations}
                  activeId={activeId}
                  onSelect={handleSelectConversation}
                  onNext={handleLoadNext}
                  onAddCustom={handleAddCustom}
                />

                {/* High Fidelity Pagination controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-3 border-t border-[#EFE9DF]">
                    <span className="text-xs text-slate-400">
                      Showing page <strong className="text-slate-600">{currentPage}</strong> of <strong className="text-slate-600">{totalPages}</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded border border-[#EFE9DF] hover:bg-[#FAF6F0] text-slate-500 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                        let pageNum = idx + 1;
                        if (currentPage > 3 && totalPages > 5) {
                          pageNum = currentPage - 3 + idx;
                          if (pageNum + (4 - idx) > totalPages) {
                            pageNum = totalPages - 4 + idx;
                          }
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 rounded text-xs font-semibold transition-all ${
                              currentPage === pageNum
                                ? "bg-[#C85A32] text-white"
                                : "border border-[#EFE9DF] text-slate-500 hover:bg-[#FAF6F0]"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded border border-[#EFE9DF] hover:bg-[#FAF6F0] text-slate-500 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Sync Success Notification Alert */}
          {syncMessage && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-5 flex gap-4 text-slate-700 animate-fadeIn">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded self-start">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-slate-900 text-sm">Database Synchronized</h4>
                <p className="text-xs text-emerald-800 leading-relaxed">{syncMessage}</p>
              </div>
            </div>
          )}

          {/* Error Notification Alert */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-100 rounded-lg p-5 flex gap-4 text-slate-700 animate-fadeIn">
              <div className="p-2 bg-rose-100 text-rose-700 rounded self-start">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-slate-900 text-sm">Failed Operation</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{errorMsg}</p>
                {errorMsg.includes("GEMINI_API_KEY") && (
                  <div className="mt-3 bg-white/60 rounded p-3 text-[11px] text-slate-500 border border-rose-100/40">
                    <span className="font-semibold text-slate-700">How to Fix:</span> Go to the <strong>Settings &gt; Secrets</strong> panel in the Google AI Studio UI, make sure your <strong>GEMINI_API_KEY</strong> secret is set, and restart the development server.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Two-Column Editor Work Environment */}
          {activeConversation && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

              {/* Left Column: Conversation Input & Live Tweak */}
              <section className="lg:col-span-6 space-y-6">
                <ConversationViewer
                  activeConversation={activeConversation}
                  onChange={handleConversationChange}
                  onReset={handleReset}
                  isCustomized={isCustomized}
                />

                {/* Action Trigger Button */}
                <button
                  onClick={handleGenerateEval}
                  disabled={loading}
                  className={`w-full py-4 px-6 rounded font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                    loading
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-[#C85A32] hover:bg-[#1A1A1A] text-white shadow-xs"
                  }`}
                >
                  <Sparkles className={`w-5 h-5 ${loading ? "animate-spin" : "animate-pulse text-amber-200"}`} />
                  {loading ? "Analyzing Dialogue & Crafting Spec..." : "Generate Eval with Gemini"}
                </button>
              </section>

              {/* Right Column: Structured Eval Specification Output */}
              <section className="lg:col-span-6 space-y-4">
                {/* Output Toggle Tabs */}
                <div className="flex items-center gap-1.5 bg-[#FAF6F0] p-1.5 rounded border border-[#EFE9DF]">
                  <button
                    onClick={() => setActivePanelTab("single")}
                    className={`flex-1 py-2 rounded text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                      activePanelTab === "single"
                        ? "bg-white text-[#C85A32] shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    Failure Spec
                  </button>
                  <button
                    onClick={() => setActivePanelTab("trajectory")}
                    className={`flex-1 py-2 rounded text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                      activePanelTab === "trajectory"
                        ? "bg-white text-[#C85A32] shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    Harbor Trace View
                  </button>
                  <button
                    onClick={() => setActivePanelTab("suite")}
                    className={`flex-1 py-2 rounded text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 relative ${
                      activePanelTab === "suite"
                        ? "bg-white text-[#C85A32] shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Eval Suite
                    {suiteResult && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    )}
                  </button>
                </div>

                {activePanelTab === "single" ? (
                  <EvalPanel
                    evaluation={evalResult}
                    onUpdate={(updated) => setEvalResult(updated)}
                    isLoading={loading}
                  />
                ) : activePanelTab === "trajectory" ? (
                  <TrajectoryViewer
                    activeConversation={activeConversation}
                    isLoading={loading}
                    onGenerateTrace={handleGenerateTrajectory}
                  />
                ) : (
                  <SuitePanel
                    suite={suiteResult}
                    isLoading={isGeneratingSuite}
                  />
                )}
              </section>
            </div>
          )}

          {/* Bottom control panel button to switch back */}
          <div className="flex justify-center pt-8 border-t border-[#EFE9DF]">
            <button
              onClick={() => setActiveView("landing")}
              className="text-xs font-bold tracking-wider uppercase border border-[#EFE9DF] bg-white hover:bg-[#FAF6F0] text-[#1A1A1A] px-6 py-3 rounded transition-colors"
            >
              ← Back to Product Info
            </button>
          </div>
        </div>
      )}

      {/* Editorial Footer */}
      <footer className="border-t border-[#EFE9DF] bg-[#FAF6F0]/60 py-12 mt-20 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <span className="font-serif text-sm font-bold tracking-tight text-[#1A1A1A]">
              Complaint<span className="text-[#C85A32]">2</span>Eval
            </span>
            <p>© 2026 Complaint2Eval. Powered by Gemini. Utilizing WildFB corpus annotations.</p>
          </div>
          <div className="flex items-center gap-6 font-semibold">
            <button onClick={() => setActiveView("landing")} className="hover:text-[#1A1A1A]">Product Info</button>
            <button onClick={() => setActiveView("demo")} className="hover:text-[#1A1A1A]">Interactive Sandbox</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
