import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Sparkles, 
  BookOpen, 
  Copy, 
  RefreshCw,
  FileText,
  AlertCircle,
  FileVideo,
  UploadCloud,
  Link as LinkIcon,
  X
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<"text" | "file" | "url">("text");
  const [content, setContent] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerateText = async () => {
    if (!content.trim()) {
      setError("請貼上想要整理的課程內容。");
      return;
    }
    
    setLoading(true);
    setError("");
    setResult("");
    
    try {
      const response = await fetch("/api/generate-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "發生錯誤，請稍後再試。");
      }
      
      setResult(data.result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFile = async () => {
    if (!file) {
      setError("請上傳想要整理的檔案。");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/generate-from-file", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "發生錯誤，請稍後再試。");
      }

      setResult(data.result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateUrl = async () => {
    if (!urlInput.trim()) {
      setError("請輸入有效的網址。");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");

    try {
      const response = await fetch("/api/generate-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "發生錯誤，請稍後再試。");
      }

      setResult(data.result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Basic validation (can expand based on needs, Gemini generally handles audio/video and PDFs etc.)
      setFile(selectedFile);
      setError("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              AI 課堂筆記整理器
            </h1>
          </div>
          <div className="text-sm text-slate-500 font-medium">
            結構化・高含金量・易複習
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-8rem)]">
          
          {/* Left Column: Input */}
          <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex space-x-1 p-1 bg-slate-200/50 rounded-lg">
                <button
                  onClick={() => setActiveTab("text")}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === "text" 
                      ? "bg-white text-indigo-600 shadow-sm" 
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  貼上文字
                </button>
                <button
                  onClick={() => setActiveTab("file")}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === "file" 
                      ? "bg-white text-indigo-600 shadow-sm" 
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  上傳檔案
                </button>
                <button
                  onClick={() => setActiveTab("url")}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === "url" 
                      ? "bg-white text-indigo-600 shadow-sm" 
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}
                >
                  <LinkIcon className="w-4 h-4" />
                  影音連結
                </button>
              </div>
            </div>
            
            <div className="flex-1 p-4 relative flex flex-col">
              {activeTab === "text" ? (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="在此貼上課程內容 (語音逐字稿、字幕或講義文字)..."
                  className="w-full h-full resize-none outline-none text-slate-700 placeholder:text-slate-300 bg-transparent leading-relaxed"
                />
              ) : activeTab === "file" ? (
                <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300 transition-colors group relative">
                  <input 
                    type="file" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                  />
                  {!file ? (
                    <div className="text-center p-6 flex flex-col items-center pointer-events-none">
                      <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-indigo-500 group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-8 h-8" />
                      </div>
                      <h3 className="font-semibold text-slate-700 mb-1">點擊或拖曳上傳檔案</h3>
                      <p className="text-sm text-slate-400 max-w-[280px]">支援 PDF, Word, PPT 以及 MP3, MP4 等影音格式 (建議 50MB 以內)</p>
                    </div>
                  ) : (
                    <div className="text-center p-6 flex flex-col items-center z-20">
                      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 text-indigo-600">
                        <FileText className="w-8 h-8" />
                      </div>
                      <h3 className="font-semibold text-slate-800 mb-2 truncate max-w-[250px]">{file.name}</h3>
                      <p className="text-xs text-slate-500 mb-4">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      
                      <button 
                        onClick={() => {
                          setFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer relative z-30"
                      >
                        <X className="w-4 h-4" /> 移除檔案
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col justify-center h-full w-full max-w-md mx-auto space-y-4">
                  <div className="text-center mb-2">
                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-500">
                      <LinkIcon className="w-8 h-8" />
                    </div>
                    <h3 className="font-semibold text-slate-700 mb-1">解析影片或網頁內容</h3>
                    <p className="text-sm text-slate-500">支援 YouTube 影片網址或其他公開文章連結</p>
                  </div>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all bg-white"
                  />
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              {error && (
                <div className="mb-3 flex items-center gap-2 text-red-500 text-sm bg-red-50 p-2 rounded-md">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
              {activeTab === "text" ? (
                <button
                  onClick={handleGenerateText}
                  disabled={loading || !content.trim()}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-medium flex justify-center items-center gap-2 transition-colors shadow-sm"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      正在為您整理筆記...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      開始整理文字筆記
                    </>
                  )}
                </button>
              ) : activeTab === "file" ? (
                <button
                  onClick={handleGenerateFile}
                  disabled={loading || !file}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-medium flex justify-center items-center gap-2 transition-colors shadow-sm"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      正在上傳並分析檔案，請稍候...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      分析檔案並整理筆記
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleGenerateUrl}
                  disabled={loading || !urlInput.trim()}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-medium flex justify-center items-center gap-2 transition-colors shadow-sm"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      正在抓取並分析連結內容...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      從連結整理筆記
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                生成結果
              </h2>
              
              <button
                onClick={handleCopy}
                disabled={!result || loading}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 transition-colors"
                title="複製筆記"
              >
                {copied ? (
                  <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                    已複製!
                  </span>
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6 bg-slate-50/30">
              {loading ? (
                <div className="h-full flex flex-col justify-center items-center text-slate-400 gap-4">
                  <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="animate-pulse font-medium text-center">
                    {activeTab === "file" ? (
                      <>正在上傳檔案並萃取核心重點<br/><span className="text-sm opacity-70">若是長篇影音，處理可能需要 1~2 分鐘，請耐心等候...</span></>
                    ) : activeTab === "url" ? (
                      "正在爬取連結內容並萃取重點，請稍候..."
                    ) : (
                      "正在萃取核心重點，請稍候..."
                    )}
                  </p>
                </div>
              ) : result ? (
                <div className="prose prose-slate prose-indigo max-w-none text-[15px] leading-relaxed
                                prose-headings:font-bold prose-h2:text-indigo-900 prose-h2:border-b prose-h2:border-slate-200 prose-h2:pb-2
                                prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
                                prose-li:marker:text-indigo-400 prose-strong:text-slate-900
                                prose-pre:bg-slate-800 prose-pre:text-slate-50 rounded-lg">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {result}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="h-full flex flex-col justify-center items-center text-slate-400 gap-3">
                  <BookOpen className="w-12 h-12 opacity-20" />
                  <p>整理後的結構化筆記將呈現在此</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
