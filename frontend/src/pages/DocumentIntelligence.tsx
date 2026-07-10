import React, { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { api, DocumentResponse } from '../services/api';
import { 
  FileText, 
  Search, 
  Clock, 
  Table,
  AlertCircle,
  FolderOpen
} from 'lucide-react';

export const DocumentIntelligence: React.FC = () => {
  const { activeProject } = useProject();
  
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentResponse | null>(null);
  
  // Search & Upload state
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<'contract' | 'invoice' | 'drawing' | 'report'>('contract');

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    if (!activeProject) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.documents.list(activeProject.id);
      setDocuments(data);
      if (data.length > 0) {
        setSelectedDoc(data[0]);
      } else {
        setSelectedDoc(null);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [activeProject]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    
    if (!searchQuery.trim()) {
      fetchDocuments();
      return;
    }

    setLoading(true);
    try {
      const data = await api.documents.search(activeProject.id, searchQuery);
      setDocuments(data);
      if (data.length > 0) {
        setSelectedDoc(data[0]);
      } else {
        setSelectedDoc(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !uploadFile) return;

    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('project_id', activeProject.id.toString());
    formData.append('file_type', docType);
    formData.append('file', uploadFile);

    try {
      const newDoc = await api.documents.upload(formData);
      setUploadFile(null);
      // Reload documents list
      await fetchDocuments();
      // Select the new document
      setSelectedDoc(newDoc);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-slate-400">Please select an active project to access Document Intelligence.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Search & Upload section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left/Middle: Document Uploader */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm flex flex-col sm:flex-row items-center gap-5 justify-between">
          <form onSubmit={handleUploadSubmit} className="w-full sm:w-auto flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 text-xs">
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as any)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 outline-none cursor-pointer"
            >
              <option value="contract">Contract</option>
              <option value="invoice">Invoice</option>
              <option value="drawing">Drawing Layout</option>
              <option value="report">Site Report</option>
            </select>
            
            <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-2.5 px-4 rounded-xl transition-all border border-slate-200 dark:border-slate-800 text-center flex-1 max-w-[200px]">
              {uploadFile ? uploadFile.name : 'Select File'}
              <input type="file" className="hidden" onChange={(e) => e.target.files && setUploadFile(e.target.files[0])} />
            </label>

            {uploadFile && (
              <button
                type="submit"
                disabled={uploading}
                className="bg-brand-600 hover:bg-brand-500 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-md shadow-brand-500/20"
              >
                {uploading ? 'Processing OCR...' : 'Upload Document'}
              </button>
            )}
          </form>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="w-full sm:w-64 relative text-xs">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search index keywords..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-4 outline-none focus:border-brand-500"
            />
          </form>
        </div>

        {/* Right side notification bell / stats */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
              Document Indexes
            </span>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Indexed: {documents.length} Files</h4>
          </div>
          <div className="rounded-xl bg-brand-50 dark:bg-brand-950/30 p-2 text-brand-600 dark:text-brand-400">
            <FolderOpen size={20} />
          </div>
        </div>

      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs text-red-500">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Main split-screen panel */}
      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* List panel */}
          <div className="glass-panel p-5 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm space-y-3 max-h-[500px] overflow-y-auto">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Documents List</h4>
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className={`
                  w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3
                  ${selectedDoc?.id === doc.id 
                    ? 'bg-brand-50 border-brand-500 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400' 
                    : 'bg-slate-50 border-slate-100 hover:bg-slate-100/60 dark:bg-slate-900/40 dark:border-slate-800 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300'}
                `}
              >
                <FileText className="shrink-0 mt-0.5" size={16} />
                <div className="truncate">
                  <span className="font-bold text-xs block truncate">{doc.name}</span>
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mt-1">{doc.file_type}</span>
                </div>
              </button>
            ))}
            {documents.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-10">No documents uploaded. Select a file above to run OCR scans.</p>
            )}
          </div>

          {/* Viewer panel */}
          {selectedDoc ? (
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[500px] overflow-y-auto">
              
              {/* Left: OCR text */}
              <div className="glass-panel p-5 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm flex flex-col">
                <div className="flex items-center gap-1.5 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <FileText className="text-slate-400" size={16} />
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Raw Text Scans</h4>
                </div>
                <div className="text-[11px] leading-relaxed font-mono whitespace-pre-wrap text-slate-600 dark:text-slate-400 flex-1 overflow-y-auto max-h-[380px] p-1.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-900">
                  {selectedDoc.ocr_text || 'OCR parsing failed.'}
                </div>
              </div>

              {/* Right: Structured attributes table */}
              <div className="glass-panel p-5 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <Table className="text-slate-400" size={16} />
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Parsed Metadata</h4>
                  </div>
                  
                  {/* Summary */}
                  <div className="mb-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">AI Executive Summary</span>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed bg-brand-50/30 dark:bg-brand-950/10 p-3 rounded-xl border border-brand-500/10">
                      {selectedDoc.summary}
                    </p>
                  </div>

                  {/* Attributes */}
                  <div className="space-y-2.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Extracted Key Values</span>
                    {selectedDoc.extraction_results && Object.entries(selectedDoc.extraction_results).map(([key, val]) => (
                      <div key={key} className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 last:border-none">
                        <span className="text-slate-400 truncate capitalize pr-2">{key.replace('_', ' ')}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-right truncate max-w-[150px]">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>Uploaded: {selectedDoc.created_at.split('T')[0]}</span>
                  </div>
                  <a
                    href={selectedDoc.file_path}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    View Original File
                  </a>
                </div>
              </div>

            </div>
          ) : (
            <div className="lg:col-span-2 glass-panel flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-slate-100 dark:border-slate-900/60 shadow-sm py-20">
              <FileText size={48} className="text-slate-300 dark:text-slate-700 mb-3" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Select a Document</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 max-w-sm leading-relaxed">
                Click a document from the left list, or select a file to upload and execute optical character recognition (OCR) parsing workflows.
              </p>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
