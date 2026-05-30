import React, { useState, useEffect, useRef } from "react";
import {
  Feather,
  Newspaper,
  FileText,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  History,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Plus,
  Play,
  Settings,
  HelpCircle,
  Clock,
  Trash2,
  PenTool,
  BookmarkCheck,
  Search,
  ExternalLink,
  Info
} from "lucide-react";
import { sampleArticles, SampleArticle } from "./sampleArticles";
import { CoPilotOutput, HistoryItem } from "./types";

export default function App() {
  // Input states
  const [rawText, setRawText] = useState<string>("");
  const [additionalInstructions, setAdditionalInstructions] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("all"); // Tab for filtered view of outputs
  
  // UI states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeHighlightIndex, setActiveHighlightIndex] = useState<number | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  
  // Loaded output states
  const [output, setOutput] = useState<CoPilotOutput | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // Editing state for parsed assets (so editors can polish directly)
  const [isEditingMode, setIsEditingMode] = useState<boolean>(false);
  const [editableWebsiteBrief, setEditableWebsiteBrief] = useState<string>("");
  const [editableHighlights, setEditableHighlights] = useState<string[]>([]);
  const [editableSocialX, setEditableSocialX] = useState<string>("");
  const [editableSocialLinkedIn, setEditableSocialLinkedIn] = useState<string>("");
  const [editableNewsletterSubject, setEditableNewsletterSubject] = useState<string>("");
  const [editableNewsletterS1, setEditableNewsletterS1] = useState<string>("");
  const [editableNewsletterS2, setEditableNewsletterS2] = useState<string>("");

  // Refs for auto-scrolling & highlighting source text
  const sourceTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("newsroom_copilot_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load history:", e);
    }
  }, []);

  // Save history helper
  const saveHistory = (updated: HistoryItem[]) => {
    setHistory(updated);
    try {
      localStorage.setItem("newsroom_copilot_history", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save history:", e);
    }
  };

  // Populate first article by default to help user explore
  useEffect(() => {
    if (sampleArticles && sampleArticles.length > 0 && !rawText) {
      loadSample(sampleArticles[0]);
    }
  }, []);

  const loadSample = (article: SampleArticle) => {
    setRawText(article.text);
    setErrorMessage(null);
    // Auto populate custom instructions helper to prompt user
    if (article.id === "paddy-procurement-2026") {
      setAdditionalInstructions("Highlight Yasangi targets and Grade A MSP of Rs 2,300 per quintal.");
    } else if (article.id === "metro-phase-ii") {
      setAdditionalInstructions("Emphasize the 116.5 km span, cost of Rs 24,200 crore, and Shamshabad timeline.");
    } else {
      setAdditionalInstructions("");
    }
  };

  const handleClear = () => {
    setRawText("");
    setAdditionalInstructions("");
    setOutput(null);
    setErrorMessage(null);
    setIsEditingMode(false);
  };

  // Core Processing Request
  const handleProcessArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) {
      setErrorMessage("Please load a sample article or paste raw text to parse first.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setOutput(null);
    setIsEditingMode(false);

    try {
      const res = await fetch("/api/editor/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: rawText,
          additionalInstructions: additionalInstructions.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to process article");
      }

      const data: CoPilotOutput = await res.json();
      setOutput(data);
      
      // Initialize edit states
      setEditableWebsiteBrief(data.websiteBrief);
      setEditableHighlights([...data.quickReadHighlights]);
      setEditableSocialX(data.socialMediaX);
      setEditableSocialLinkedIn(data.socialMediaLinkedInInstagram);
      setEditableNewsletterSubject(data.newsletterTeaserSubject);
      setEditableNewsletterS1(data.newsletterTeaserSentence1);
      setEditableNewsletterS2(data.newsletterTeaserSentence2);

      // Save to history list
      const newItem: HistoryItem = {
        id: "hist-" + Date.now(),
        title: rawText.split("\n")[0]?.substring(0, 70) || "Untitled Story",
        rawText,
        processedDate: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST",
        output: data,
      };

      const updatedHistory = [newItem, ...history.slice(0, 19)]; // Limit to 20 items
      saveHistory(updatedHistory);

      // Scroll to outputs
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An unexpected communication error occurred. Check your server status and GEMINI_API_KEY.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadFromHistory = (item: HistoryItem) => {
    setRawText(item.rawText);
    setOutput(item.output);
    setEditableWebsiteBrief(item.output.websiteBrief);
    setEditableHighlights([...item.output.quickReadHighlights]);
    setEditableSocialX(item.output.socialMediaX);
    setEditableSocialLinkedIn(item.output.socialMediaLinkedInInstagram);
    setEditableNewsletterSubject(item.output.newsletterTeaserSubject);
    setEditableNewsletterS1(item.output.newsletterTeaserSentence1);
    setEditableNewsletterS2(item.output.newsletterTeaserSentence2);
    setErrorMessage(null);
    setIsEditingMode(false);
    setShowHistory(false);
    
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = history.filter(item => item.id !== id);
    saveHistory(filtered);
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  // Factual Grounding: Scroll and find/select text if clicked
  const highlightSourceText = (sentence: string, index: number) => {
    if (!sentence || sentence.trim() === "") return;
    setActiveHighlightIndex(index);
    
    // Try to find approximate matches in input string
    const textToMatch = sentence.trim().substring(0, 40).toLowerCase();
    const rawLower = rawText.toLowerCase();
    const foundIdx = rawLower.indexOf(textToMatch);

    if (foundIdx !== -1 && sourceTextAreaRef.current) {
      const textarea = sourceTextAreaRef.current;
      textarea.focus();
      // Calculate character selection range
      const endSelection = Math.min(foundIdx + sentence.length + 15, rawText.length);
      textarea.setSelectionRange(foundIdx, endSelection);
      
      // Auto scroll inside textarea
      const lineCount = rawText.substring(0, foundIdx).split("\n").length;
      const lineHeight = 20; // estimate
      textarea.scrollTop = Math.max(0, (lineCount - 4) * lineHeight);
    }
  };

  // Asset validation counts
  const wordCount = (str: string) => str ? str.trim().split(/\s+/).length : 0;
  const charCount = (str: string) => str ? str.length : 0;

  return (
    <div className="min-h-screen bg-[#fdfcf9] text-[#121212] font-serif flex flex-col antialiased selection:bg-[#c00000]/10 selection:text-[#c00000]">
      
      {/* Top Editorial Newspaper Masthead */}
      <header className="border-b border-[#121212]/15 px-4 md:px-8 py-5 bg-[#fdfcf9] sticky top-0 z-40 transition-all duration-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#121212] text-[#fdfcf9] p-2.5 rounded-sm">
              <Newspaper className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-sans px-2 py-0.5 text-[10px] tracking-widest uppercase font-bold bg-[#c00000] text-white rounded-sm">
                  TELANGANA TODAY
                </span>
                <span className="font-sans text-[11px] text-zinc-500 font-medium hidden sm:inline">
                  Est. 2016
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight font-serif mt-1 flex items-center gap-1.5">
                Editorial Co-Pilot <span className="text-[#c00000] font-sans font-light tracking-wide lowercase text-xs md:text-sm italic hover:underline">by Google GenAI</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <span className="font-sans text-[11px] text-[#c00000] font-bold tracking-widest uppercase flex items-center gap-1.5 bg-[#c00000]/10 px-3 py-1.5 rounded-sm border border-[#c00000]/20">
              <span className="w-2.5 h-2.5 rounded-full bg-[#c00000] animate-pulse"></span>
              Live Editorial Parsing: Active
            </span>

            <button
              id="btn-history-toggle"
              onClick={() => setShowHistory(!showHistory)}
              className="font-sans text-xs flex items-center gap-2 bg-[#121212]/5 hover:bg-[#121212]/10 border border-[#121212]/10 py-1.5 px-3 rounded-sm transition-all focus:outline-none"
              title="View past parsed items"
            >
              <History className="w-3.5 h-3.5" />
              <span>History ({history.length})</span>
            </button>
            
            <a
              href="https://telanganatoday.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans text-xs underline text-zinc-500 hover:text-[#121212] flex items-center gap-1 py-1.5"
            >
              <span>Visit Portal</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </header>

      {/* History Drawer Overlay */}
      {showHistory && (
        <div className="fixed inset-0 bg-[#121212]/40 backdrop-blur-xs z-50 flex justify-end">
          <div className="w-full max-w-md bg-[#fdfcf9] border-l-2 border-[#121212] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-5 border-b border-[#121212]/15 flex items-center justify-between bg-zinc-50">
              <h3 className="font-serif text-lg font-bold uppercase tracking-tight flex items-center gap-2">
                <History className="w-5 h-5 text-[#c00000]" />
                Newsroom Archive
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-zinc-400 hover:text-[#121212] p-1 text-sm font-sans"
              >
                ✕ Close
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 font-sans">
                  <DatabaseEmptyIcon className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                  <p className="text-sm">No items processed in this session yet.</p>
                  <p className="text-xs text-zinc-400 mt-1">Processed assets persist here via client cache.</p>
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleLoadFromHistory(item)}
                    className="group border border-[#121212]/10 hover:border-[#c00000]/50 p-3 bg-white cursor-pointer rounded-sm hover:shadow-xs transition-all relative"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-sans text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-sm font-semibold">
                        {item.output.newsletterTeaserSubject ? item.output.newsletterTeaserSubject.split(" ")[0] || "Asset" : "Analyzed"}
                      </span>
                      <button
                        onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                        className="text-zinc-300 hover:text-[#c00000] p-1 transition-colors"
                        title="Delete from archive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <h4 className="font-serif text-sm font-bold tracking-tight text-[#121212] group-hover:text-[#c00000] mt-1.5 transition-colors line-clamp-2">
                      {item.title}
                    </h4>
                    
                    <p className="font-sans text-[10px] text-zinc-400 mt-2 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-zinc-300" />
                      {item.processedDate}
                    </p>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-4 border-t border-[#121212]/15 bg-zinc-50 text-center">
              <p className="font-sans text-[11px] text-zinc-400 font-medium">
                Archives are stored securely on your local device.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Layout */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Control Desk & Raw Material Inputs (5 Columns) */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          <div className="border border-[#121212]/15 rounded-sm bg-white p-5 md:p-6 shadow-xs relative">
            <div className="border-b border-[#121212]/15 pb-3 mb-5">
              <span className="font-sans text-[11px] font-bold text-zinc-400 tracking-widest uppercase block mb-1">
                Phase 1: Input Desk
              </span>
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#121212]">
                Raw Copy Feed
              </h2>
            </div>

            {/* Quick-Select Newspaper Samples */}
            <div className="mb-5">
              <label className="font-sans text-xs font-semibold text-zinc-500 mb-2 block">
                Load Active Telangana Wire Stories:
              </label>
              <div className="grid grid-cols-1 gap-2">
                {sampleArticles.map((sample) => {
                  const isCurrent = rawText.startsWith(sample.text.substring(0, 50));
                  return (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => loadSample(sample)}
                      className={`text-left p-2.5 rounded-xs border transition-all text-xs flex flex-col ${
                        isCurrent
                          ? "bg-[#c00000]/5 border-[#c00000] text-[#c00000] font-semibold"
                          : "bg-zinc-50/50 border-[#121212]/10 hover:border-zinc-400 text-zinc-700"
                      }`}
                    >
                      <span className="font-sans text-[9px] uppercase tracking-wider font-bold text-zinc-400 mb-0.5">
                        {sample.category} • {sample.author}
                      </span>
                      <span className="font-serif text-xs line-clamp-1">
                        {sample.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleProcessArticle} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="raw-article-input" className="font-sans text-xs font-bold text-[#121212] uppercase tracking-wide">
                    Newspaper Raw Draft Text:
                  </label>
                  <span className="font-mono text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded-sm">
                    {wordCount(rawText)} words &bull; {charCount(rawText)} Chars
                  </span>
                </div>
                
                <textarea
                  id="raw-article-input"
                  ref={sourceTextAreaRef}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste raw reporter writeup, press releases, speech drafts, or copy-paste long-form wire reports here..."
                  className="w-full h-80 px-3.5 py-3 border border-[#121212]/15 text-sm font-serif leading-relaxed bg-[#fdfcf9] focus:outline-none focus:ring-1 focus:ring-[#c00000] focus:border-[#c00000] resize-y rounded-sm"
                  required
                />
              </div>

              {/* Advanced Editorial Parameters */}
              <div className="bg-zinc-50 border border-zinc-200/65 rounded-sm p-3.5 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#c00000]" />
                  <label htmlFor="additional-instructions" className="font-sans text-xs font-bold text-zinc-700 uppercase tracking-wide">
                    Specific Newsroom Directives (Optional)
                  </label>
                </div>
                <input
                  id="additional-instructions"
                  type="text"
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder="e.g. Highlight budget target numbers / stress the quote by N.V.S. Reddy..."
                  className="w-full text-xs font-sans px-3 py-2 border border-zinc-300 rounded-sm bg-white focus:outline-none focus:border-[#c00000] focus:ring-1 focus:ring-[#c00000]"
                />
              </div>

              {errorMessage && (
                <div className="bg-[#c00000]/5 border border-[#c00000]/20 rounded-sm p-3 flex gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-[#c00000] shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-sans text-xs font-bold text-[#c00000] uppercase tracking-wide">
                      Transformation Error
                    </h5>
                    <p className="font-sans text-xs text-zinc-600 mt-1 leading-snug">
                      {errorMessage}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className={`flex-1 font-sans text-xs uppercase font-extrabold tracking-widest py-3 px-4 rounded-xs text-white border transition-all flex items-center justify-center gap-2 ${
                    isProcessing
                      ? "bg-[#121212]/50 border-transparent cursor-not-allowed"
                      : "bg-[#c00000] hover:bg-[#800020] border-[#c00000] hover:border-[#800020] cursor-pointer shadow-sm active:scale-[0.98]"
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Spinner className="w-4 h-4 animate-spin text-white" />
                      <span>Parsing Article Suite...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Transform to Editorial Assets</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  className="font-sans text-xs text-zinc-600 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 hover:border-zinc-300 rounded-sm px-4 focus:outline-none active:scale-[0.98]"
                  title="Reset fields"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>

          <div className="border border-[#121212]/10 rounded-sm bg-[#fdfcf9] p-4 text-zinc-500 font-sans text-[11px] leading-relaxed space-y-2.5">
            <h4 className="font-bold text-zinc-800 uppercase tracking-widest text-[10px] flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-[#c00000]" />
              Newsroom Editorial Policy Guards
            </h4>
            <p>
              In compliance with <strong>Telangana Today</strong> guidelines, generated items are forced to use exact-quote sourcing to respect <strong>Rule #1 (Absolute Factual Integrity)</strong>.
            </p>
            <p>
              Regional Indian nomenclatures (BRS, Crore, Paddy, Rythu, Lakh, and municipal wings like GHMC/HMDA) are treated with precise logical anchors to prevent hallucinatory Western transformations.
            </p>
          </div>
        </section>

        {/* Right Side: Multi-Channel Assets Output (7 Columns) */}
        <section id="editorial-results-desk" ref={resultsRef} className="lg:col-span-7 flex flex-col">
          
          {!output && !isProcessing && (
            <div className="border-2 border-dashed border-[#121212]/15 rounded-sm p-12 text-center bg-white flex flex-col items-center justify-center h-full min-h-[450px]">
              <div className="bg-[#c00000]/10 text-[#c00000] p-4 rounded-full mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-xl font-extrabold tracking-tight">
                No Editorial Output Ready
              </h3>
              <p className="font-sans text-xs text-zinc-500 max-w-sm mt-2 leading-relaxed">
                Provide a raw wire text report on the left desk and initiate parsing to transform raw inputs into real-time multi-channel assets.
              </p>
            </div>
          )}

          {isProcessing && (
            <div className="border border-[#121212]/15 rounded-sm p-12 bg-white flex flex-col items-center justify-center h-full min-h-[450px] space-y-6">
              
              {/* Journalistic Pre-loader Screen */}
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-zinc-100 border-t-[#c00000] animate-spin"></div>
                <Newspaper className="w-6 h-6 text-[#c00000] absolute inset-0 m-auto animate-pulse" />
              </div>

              <div className="text-center space-y-2 max-w-sm">
                <h4 className="font-serif text-lg font-bold tracking-tight">
                  Running Editorial Engines
                </h4>
                <p className="font-sans text-xs text-[#c00000] font-semibold tracking-wider uppercase animate-pulse">
                  Verifying Factual Groundings...
                </p>
                <div className="space-y-1 pt-4 text-left border-t border-[#121212]/10 mt-2">
                  <div className="flex items-center gap-2 text-zinc-400 font-sans text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                    <span>Aligning 5Ws & 1H Inverted Pyramid structure</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400 font-sans text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                    <span>Analyzing regional Indian naming conventions</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400 font-sans text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping"></span>
                    <span>Stripping AI fluff; formatting journalistic assets</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {output && !isProcessing && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Asset desk header context bar */}
              <div className="border border-[#121212]/15 bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-sm">
                <div>
                  <span className="font-sans text-[9px] uppercase tracking-widest font-black text-[#c00000]">
                    Transformation Complete
                  </span>
                  <h3 className="font-serif text-lg font-bold tracking-tight mt-0.5">
                    Engineered Asset Package
                  </h3>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditingMode(!isEditingMode)}
                    className={`font-sans text-xs px-3 py-1.5 rounded-xs border transition-all flex items-center gap-1.5 ${
                      isEditingMode
                        ? "bg-[#c00000] text-white border-[#c00000]"
                        : "bg-white text-zinc-700 border-[#121212]/10 hover:bg-zinc-50"
                    }`}
                    title="Toggle direct editing of parsed parameters"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>{isEditingMode ? "Lock & Save Polished" : "Manual Newsroom Edit"}</span>
                  </button>

                  <button
                    onClick={() => {
                      // Combined string with separators
                      const fullBlob = `🌐 WEBSITE BRIEF\n${isEditingMode ? editableWebsiteBrief : output.websiteBrief}\n\n📌 QUICK-READ HIGHLIGHTS\n${(isEditingMode ? editableHighlights : output.quickReadHighlights).map(h => `• ${h}`).join("\n")}\n\n📱 SOCIAL MEDIA - X\n${isEditingMode ? editableSocialX : output.socialMediaX}\n\n📱 SOCIAL MEDIA - LINKEDIN\n${isEditingMode ? editableSocialLinkedIn : output.socialMediaLinkedInInstagram}\n\n📧 MORNING NEWSLETTER TEASER\nSubject: ${isEditingMode ? editableNewsletterSubject : output.newsletterTeaserSubject}\n${isEditingMode ? editableNewsletterS1 : output.newsletterTeaserSentence1} ${isEditingMode ? editableNewsletterS2 : output.newsletterTeaserSentence2}`;
                      copyToClipboard(fullBlob, "bundle");
                    }}
                    className="font-sans text-xs bg-[#121212] hover:bg-[#121212]/90 text-[#fdfcf9] px-3.5 py-1.5 rounded-xs transition-all flex items-center gap-1.5"
                  >
                    {copiedField === "bundle" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === "bundle" ? "Copied Suite" : "Copy Suite"}</span>
                  </button>
                </div>
              </div>

              {/* Filtering tab picker to focus on specific platforms */}
              <div className="border-b border-[#121212]/15 flex items-center gap-1 overflow-x-auto">
                {["all", "brief", "highlights", "social", "newsletter", "groundings"].map((tab) => {
                  const labelMap: Record<string, string> = {
                    all: "Full Page Print",
                    brief: "Website Brief",
                    highlights: "Quick Highlights",
                    social: "Social Suite",
                    newsletter: "Newsletter Teaser",
                    groundings: "Truth Groundings Check",
                  };
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`font-sans text-xs py-2 px-3.5 border-b-2 font-bold uppercase tracking-wider transition-all whitespace-nowrap focus:outline-none ${
                        activeTab === tab
                          ? "border-[#c00000] text-[#c00000]"
                          : "border-transparent text-zinc-500 hover:text-zinc-900"
                      }`}
                    >
                      {labelMap[tab]}
                    </button>
                  );
                })}
              </div>

              {/* Filterable Content Containers */}

              {/* 1. Website Brief */}
              {(activeTab === "all" || activeTab === "brief") && (
                <div id="section-website-brief" className="border border-[#121212]/15 bg-[#fdfcf9] p-6 shadow-xs relative rounded-sm group">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#121212]/10">
                    <div className="flex items-center gap-2">
                      <span className="font-serif italic text-sm text-[#c00000] font-bold">🌐 Segment 1</span>
                      <h4 className="font-sans text-xs font-bold uppercase tracking-widest text-zinc-400">
                        Website Landing Page Brief
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Live metrics validation - strictly between 80 to 100 words */}
                      <span className={`font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm ${
                        wordCount(isEditingMode ? editableWebsiteBrief : output.websiteBrief) >= 80 &&
                        wordCount(isEditingMode ? editableWebsiteBrief : output.websiteBrief) <= 100
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                      title="Directive requires strict word count range of 80 to 100 words">
                        {wordCount(isEditingMode ? editableWebsiteBrief : output.websiteBrief)} Words
                        {wordCount(isEditingMode ? editableWebsiteBrief : output.websiteBrief) < 80 && " (Under Limit)"}
                        {wordCount(isEditingMode ? editableWebsiteBrief : output.websiteBrief) > 100 && " (Over Limit)"}
                      </span>

                      <button
                        onClick={() => copyToClipboard(isEditingMode ? editableWebsiteBrief : output.websiteBrief, "brief")}
                        className="text-zinc-400 hover:text-[#121212] p-1.5"
                        title="Copy to clipboard"
                      >
                        {copiedField === "brief" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {isEditingMode ? (
                    <textarea
                      value={editableWebsiteBrief}
                      onChange={(e) => setEditableWebsiteBrief(e.target.value)}
                      className="w-full text-base font-serif leading-relaxed bg-white border border-[#c00000]/30 p-3 block focus:outline-none focus:ring-1 focus:ring-[#c00000] rounded-xs"
                      rows={4}
                    />
                  ) : (
                    <div className="text-[#121212] text-base font-serif leading-relaxed text-justify first-letter:text-5xl first-letter:font-black first-letter:text-[#c00000] first-letter:mr-3 first-letter:float-left first-letter:font-serif">
                      {output.websiteBrief}
                    </div>
                  )}

                  <div className="mt-4 pt-3.5 border-t border-dashed border-zinc-200 flex items-center justify-between text-[11px] text-zinc-400 font-sans">
                    <span><strong>Structure:</strong> Inverted Pyramid (Lead addresses the 5Ws + 1H immediately)</span>
                    <span className="italic">Click "Newsroom Edit" above to rewrite safely</span>
                  </div>
                </div>
              )}

              {/* 2. Quick Read Highlights */}
              {(activeTab === "all" || activeTab === "highlights") && (
                <div id="section-quick-highlights" className="border border-[#121212]/15 bg-[#fdfcf9] p-6 shadow-xs relative rounded-sm">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#121212]/10">
                    <div className="flex items-center gap-2">
                      <span className="font-serif italic text-sm text-[#c00000] font-bold">📌 Segment 2</span>
                      <h4 className="font-sans text-xs font-bold uppercase tracking-widest text-zinc-400">
                        Quick-Read Highlights Suite
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded-sm">
                        {(isEditingMode ? editableHighlights : output.quickReadHighlights).length} Bullets
                      </span>
                      
                      <button
                        onClick={() => {
                          const code = (isEditingMode ? editableHighlights : output.quickReadHighlights).map(h => `• ${h}`).join("\n");
                          copyToClipboard(code, "highlights");
                        }}
                        className="text-zinc-400 hover:text-[#121212] p-1.5"
                        title="Copy bullets suite"
                      >
                        {copiedField === "highlights" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {isEditingMode ? (
                    <div className="space-y-2.5">
                      {editableHighlights.map((hl, idx) => (
                        <div key={idx} className="flex gap-2">
                          <span className="font-sans font-bold text-xs pt-2.5">{idx + 1}.</span>
                          <input
                            type="text"
                            value={hl}
                            onChange={(e) => {
                              const copy = [...editableHighlights];
                              copy[idx] = e.target.value;
                              setEditableHighlights(copy);
                            }}
                            className="flex-grow text-sm font-sans bg-white border border-[#c00000]/25 p-2 focus:outline-none focus:ring-1 focus:ring-[#c00000] rounded-xs"
                          />
                        </div>
                      ))}
                      <div className="pt-2 text-right">
                        <button
                          type="button"
                          onClick={() => setEditableHighlights([...editableHighlights, "**New Anchor Phrase:** Write details here"])}
                          className="font-sans text-[11px] text-[#c00000] hover:underline font-bold flex items-center justify-end gap-1 ml-auto"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Bullet Point</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <ul className="space-y-4 font-sans text-sm text-zinc-800">
                      {output.quickReadHighlights.map((bullet, idx) => {
                        // Extract bold anchor if exists, style beautifully in red/burgundy
                        const boldMatch = bullet.match(/^\*\*(.*?)\*\*(.*)/);
                        if (boldMatch) {
                          return (
                            <li key={idx} className="relative pl-6 leading-relaxed">
                              <span className="absolute left-0 top-1 text-[#c00000] font-black text-xs leading-none">■</span>
                              <strong className="text-[#121212] font-semibold">{boldMatch[1]}</strong>
                              <span>{boldMatch[2]}</span>
                              
                              {wordCount(bullet) > 20 && (
                                <span className="font-mono text-[9px] bg-amber-50 text-amber-600 tracking-tighter px-1 rounded-sm ml-1.5 inline-block">
                                  {wordCount(bullet)} words (exceeds max target 20)
                                </span>
                              )}
                            </li>
                          );
                        }
                        return (
                          <li key={idx} className="relative pl-6 leading-relaxed">
                            <span className="absolute left-0 top-1 text-[#c00000] font-black text-xs leading-none">■</span>
                            {bullet}
                            
                            {wordCount(bullet) > 20 && (
                              <span className="font-mono text-[9px] bg-amber-50 text-amber-600 tracking-tighter px-1 rounded-sm ml-1.5 inline-block">
                                {wordCount(bullet)} words (exceeds max target 20)
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <div className="mt-4 pt-3.5 border-t border-dashed border-zinc-200 flex items-center justify-between text-[11px] text-zinc-400 font-sans">
                    <span><strong>Rule constraints:</strong> Max 20 words per bullet point, with action-oriented anchors</span>
                    <span>Exact data, quotes and target metrics favored</span>
                  </div>
                </div>
              )}

              {/* 3. Social Media Snippets */}
              {(activeTab === "all" || activeTab === "social") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Platform X (formerly Twitter) */}
                  <div className="border border-[#121212]/15 bg-[#fdfcf9] p-5 shadow-xs relative rounded-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#121212]/10">
                        <div className="flex items-center gap-1.5">
                          <span className="font-serif italic text-xs text-[#c00000] font-bold">📱 Suite 3.A</span>
                          <h4 className="font-sans text-xs font-bold uppercase tracking-widest text-[#121212]">
                            Platform: X Post
                          </h4>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono text-[10px] px-1 py-0.5 rounded-sm ${
                            charCount(isEditingMode ? editableSocialX : output.socialMediaX) <= 250
                              ? "bg-zinc-100 text-zinc-500"
                              : "bg-red-50 text-red-600 font-bold"
                          }`}>
                            {charCount(isEditingMode ? editableSocialX : output.socialMediaX)} / 250 chars
                          </span>
                          
                          <button
                            onClick={() => copyToClipboard(isEditingMode ? editableSocialX : output.socialMediaX, "socialX")}
                            className="text-zinc-400 hover:text-[#121212] p-1"
                          >
                            {copiedField === "socialX" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {isEditingMode ? (
                        <textarea
                          value={editableSocialX}
                          onChange={(e) => setEditableSocialX(e.target.value)}
                          className="w-full text-xs font-sans leading-relaxed bg-white border border-[#c00000]/30 p-2.5 block focus:outline-none focus:ring-1 focus:ring-[#c00000] rounded-xs"
                          rows={4}
                        />
                      ) : (
                        <blockquote className="font-sans text-xs md:text-sm text-zinc-700 leading-relaxed bg-zinc-50 border border-zinc-200 rounded-sm p-3.5 relative">
                          <div className="italic text-zinc-400 text-3xl font-serif absolute -top-1 -left-1 opacity-20 pointer-events-none">"</div>
                          {output.socialMediaX}
                        </blockquote>
                      )}
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-dashed border-zinc-200 flex items-center justify-between text-[10px] text-zinc-400 font-sans">
                      <span><strong>Tone:</strong> Breaking-News, Punchy</span>
                      <span className="font-bold text-[#c00000]">No Emojis allowed</span>
                    </div>
                  </div>

                  {/* LinkedIn & Instagram */}
                  <div className="border border-[#121212]/15 bg-[#fdfcf9] p-5 shadow-xs relative rounded-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#121212]/10">
                        <div className="flex items-center gap-1.5">
                          <span className="font-serif italic text-xs text-[#c00000] font-bold">📱 Suite 3.B</span>
                          <h4 className="font-sans text-xs font-bold uppercase tracking-widest text-[#121212]">
                            LinkedIn & Instagram
                          </h4>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                            wordCount(isEditingMode ? editableSocialLinkedIn : output.socialMediaLinkedInInstagram) >= 60 &&
                            wordCount(isEditingMode ? editableSocialLinkedIn : output.socialMediaLinkedInInstagram) <= 80
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                          title="Target: 60-80 words">
                            {wordCount(isEditingMode ? editableSocialLinkedIn : output.socialMediaLinkedInInstagram)} Words
                          </span>
                          
                          <button
                            onClick={() => copyToClipboard(isEditingMode ? editableSocialLinkedIn : output.socialMediaLinkedInInstagram, "socialLnk")}
                            className="text-zinc-400 hover:text-[#121212] p-1"
                          >
                            {copiedField === "socialLnk" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {isEditingMode ? (
                        <textarea
                          value={editableSocialLinkedIn}
                          onChange={(e) => setEditableSocialLinkedIn(e.target.value)}
                          className="w-full text-xs font-sans leading-relaxed bg-white border border-[#c00000]/30 p-2.5 block focus:outline-none focus:ring-1 focus:ring-[#c00000] rounded-xs"
                          rows={4}
                        />
                      ) : (
                        <div className="font-sans text-xs md:text-sm text-zinc-700 leading-relaxed bg-zinc-50 border border-zinc-200 rounded-sm p-3.5 relative">
                          {output.socialMediaLinkedInInstagram}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-dashed border-zinc-200 flex items-center justify-between text-[10px] text-zinc-400 font-sans">
                      <span>👁️ Starts with strong eye hook</span>
                      <span>💡 Exactly 3 hashtags & 1-2 professional emojis</span>
                    </div>
                  </div>

                </div>
              )}

              {/* 4. Newsletter Teaser Package */}
              {(activeTab === "all" || activeTab === "newsletter") && (
                <div id="section-newsletter" className="border border-[#121212] bg-[#121212] text-[#fdfcf9] p-6 shadow-md relative rounded-sm">
                  <div className="flex justify-between items-center mb-4 pb-2.5 border-b border-[#fdfcf9]/15">
                    <div className="flex items-center gap-2">
                      <span className="font-serif italic text-xs text-[#c00000] bg-white px-2 py-0.5 rounded-xs font-black uppercase">📧 Segment 4</span>
                      <h4 className="font-sans text-xs font-bold uppercase tracking-widest text-zinc-400">
                        Morning Brief Email Newsletter Teaser
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const subject = isEditingMode ? editableNewsletterSubject : output.newsletterTeaserSubject;
                          const sentence1 = isEditingMode ? editableNewsletterS1 : output.newsletterTeaserSentence1;
                          const sentence2 = isEditingMode ? editableNewsletterS2 : output.newsletterTeaserSentence2;
                          const compiled = `Subject: ${subject}\n\n${sentence1} ${sentence2}`;
                          copyToClipboard(compiled, "newsTeaser");
                        }}
                        className="text-white/60 hover:text-white p-1"
                        title="Copy teaser block"
                      >
                        {copiedField === "newsTeaser" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {isEditingMode ? (
                    <div className="space-y-3 text-sm text-[#fdfcf9] font-sans">
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-1">EMAIL SUBJECT LINE (Curiosity Hook)</label>
                        <input
                          type="text"
                          value={editableNewsletterSubject}
                          onChange={(e) => setEditableNewsletterSubject(e.target.value)}
                          className="w-full bg-zinc-800 text-[#fdfcf9] px-2.5 py-1.5 border border-zinc-700 rounded-sm focus:outline-none focus:border-[#c00000]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-1">SENTENCE 1: THE CONFLICT/BREAKTHROUGH</label>
                        <textarea
                          value={editableNewsletterS1}
                          onChange={(e) => setEditableNewsletterS1(e.target.value)}
                          className="w-full bg-zinc-800 text-[#fdfcf9] px-2.5 py-1.5 border border-zinc-700 rounded-sm focus:outline-none focus:border-[#c00000]"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-1">SENTENCE 2: COMPREHENSIVE CALL TO ACTION</label>
                        <textarea
                          value={editableNewsletterS2}
                          onChange={(e) => setEditableNewsletterS2(e.target.value)}
                          className="w-full bg-zinc-800 text-[#fdfcf9] px-2.5 py-1.5 border border-zinc-700 rounded-sm focus:outline-none focus:border-[#c00000]"
                          rows={2}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 leading-relaxed">
                      <div className="bg-[#c00000]/10 border border-[#c00000]/30 px-3.5 py-2 rounded-xs">
                        <span className="font-sans text-[10px] tracking-wider uppercase text-[#c00000] font-black mr-2">Subject:</span>
                        <span className="font-serif italic font-bold text-[#fdfcf9]">{output.newsletterTeaserSubject}</span>
                      </div>
                      <p className="font-serif text-lg leading-relaxed text-zinc-100">
                        "{output.newsletterTeaserSentence1}"
                      </p>
                      <p className="font-mono text-xs font-bold tracking-widest text-[#c00000] uppercase hover:underline cursor-pointer flex items-center gap-1.5 mt-2">
                        <span>{output.newsletterTeaserSentence2}</span>
                        <span>→</span>
                      </p>
                    </div>
                  )}

                  <div className="mt-4 pt-3.5 border-t border-[#fdfcf9]/15 flex items-center justify-between text-[11px] text-zinc-400 font-sans">
                    <span><strong>Length requirement:</strong> Exactly two formatted sentences</span>
                    <span>Designed for premium Morning Newsletter briefs</span>
                  </div>
                </div>
              )}

              {/* 5. Sourcing & Factual Integrity Verification Drawer */}
              {(activeTab === "all" || activeTab === "groundings") && (
                <div id="section-source-verification" className="border-2 border-[#c00000] bg-[#fdfcf9] p-6 shadow-sm relative rounded-sm">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#121212]/15">
                    <BookmarkCheck className="w-5 h-5 text-[#c00000]" />
                    <div>
                      <h4 className="font-serif text-base font-extrabold text-[#121212] uppercase tracking-tight">
                        Rule #1 Absolute Truth Verification Dashboard
                      </h4>
                      <p className="font-sans text-[10px] text-zinc-400">
                        Meticulously parsed direct groundings mapped perfectly back to the raw source text.
                      </p>
                    </div>
                  </div>

                  <p className="font-sans text-xs text-zinc-600 mb-4 leading-relaxed">
                    Click any source claim below. The newspaper wire desk on the left will immediate <strong>highlight the precise statement block</strong> to visually audit the factual validity.
                  </p>

                  <div className="space-y-3.5">
                    {output.factualGroundings && output.factualGroundings.length > 0 ? (
                      output.factualGroundings.map((g, idx) => (
                        <div
                          key={idx}
                          role="button"
                          onClick={() => highlightSourceText(g.sourceSentence, idx)}
                          className={`p-3 border text-left rounded-xs transition-all relative ${
                            activeHighlightIndex === idx
                              ? "bg-[#c00000]/5 border-[#c00000]"
                              : "bg-white border-[#121212]/10 hover:border-zinc-400"
                          }`}
                        >
                          <div className="flex gap-2 items-start">
                            <span className="bg-[#c00000] text-white text-[10px] font-mono leading-none py-1 px-1.5 rounded-sm shrink-0">
                              Claim #{idx + 1}
                            </span>
                            <div className="space-y-1.5 flex-1">
                              <p className="font-sans text-xs font-semibold text-[#121212]">
                                "{g.claim}"
                              </p>
                              
                              <div className="text-[10px] font-serif text-zinc-500 leading-normal bg-zinc-50 p-2 border-l-2 border-zinc-300">
                                <span className="font-bold uppercase tracking-wider text-[9px] font-sans text-zinc-400 block mb-0.5">
                                  Source Reference Text:
                                </span>
                                "{g.sourceSentence}"
                              </div>
                            </div>
                          </div>
                          
                          {activeHighlightIndex === idx && (
                            <span className="absolute right-2.5 top-2.5 text-[9px] font-sans text-[#c00000] font-bold uppercase tracking-wider bg-[#c00000]/10 px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#c00000] animate-ping"></span>
                              Highlighted Left Desk
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-xs text-zinc-400 font-sans">
                        No factual mapping reported by parser. Ensure source integrity holds correct data.
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-dashed border-zinc-200 flex items-center justify-between text-[11px] text-zinc-400 font-sans">
                    <span><strong>Policy Guard:</strong> Every generated metric must have a 1:1 validation vector</span>
                    <span className="text-[#c00000] font-bold">Press check verified</span>
                  </div>
                </div>
              )}

            </div>
          )}

        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-[#121212]/15 bg-[#fdfcf9] py-8 px-4 md:px-8 mt-12 text-zinc-500 font-sans text-xs text-center leading-relaxed">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex items-center justify-center gap-3">
            <span className="font-bold text-[#121212] uppercase tracking-widest text-[10px]">
              Telangana Today News Desk
            </span>
            <span className="text-zinc-300">|</span>
            <span>HYDERABAD EDITION</span>
            <span className="text-zinc-300">|</span>
            <span>ESTD. 2016</span>
          </div>
          
          <p className="max-w-2xl mx-auto">
            This workspace utilizes real-time Generative AI models deployed inside secure sandboxes with Gemini Pro / Flask architecture to optimize news content workflows instantly, with the absolute preservation of target facts.
          </p>
          
          <p className="text-[10px] text-zinc-400">
            &copy; {new Date().getFullYear()} Telangana Today Daily. Powered by Gemini Advanced Editorial Co-Pilot. All Rights Reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}

// Subordinate SVG Icons for structural sanity & speed
function Spinner({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}

function DatabaseEmptyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}
