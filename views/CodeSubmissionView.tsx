import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, Calendar, Trash2, AlertCircle, BarChart3, PanelLeftClose, PanelLeftOpen, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { parseCodeSubmissionFile } from '../services/parsers';
import { saveCodeAnalysisReport, getAllCodeAnalysisReports, deleteCodeAnalysisReport } from '../services/db';
import { WeeklyReport, DataStore } from '../types';

// --- Shared Components ---
const COLORS = { pure_commit: '#3b82f6', code_review: '#22c55e' };
const PIE_COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316', '#eab308', '#84cc16', '#10b981', '#06b6d4', '#0ea5e9'];

// Helper to generate column labels (A, B, C...)
const getColLabel = (index: number) => {
  let label = '';
  index++;
  while (index > 0) {
    const rem = (index - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    index = Math.floor((index - 1) / 26);
  }
  return label;
};

const RawDataViewer: React.FC<{ data: Record<string, any[][]> }> = ({ data }) => {
  const sheets = Object.keys(data);
  const [activeSheet, setActiveSheet] = useState(sheets[0]);
  const sheetData = data[activeSheet] || [];
  
  // Calculate max columns to normalize grid
  const maxCols = sheetData.reduce((acc, row) => Math.max(acc, row ? row.length : 0), 0);

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex gap-2 p-3 bg-gray-50 border-b border-gray-200 overflow-x-auto">
        {sheets.map(sheet => (
           <button 
             key={sheet}
             onClick={() => setActiveSheet(sheet)}
             className={`px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${activeSheet === sheet ? 'bg-white text-indigo-700 font-semibold shadow-sm ring-1 ring-gray-200' : 'text-gray-600 hover:bg-white hover:text-gray-900'}`}
           >
             {sheet}
           </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto relative">
         <table className="w-full text-sm text-left text-gray-600 border-collapse">
            <thead className="bg-gray-50 text-gray-700 font-semibold sticky top-0 z-10 shadow-sm">
              <tr>
                 <th className="p-3 border-b border-r border-gray-200 bg-gray-50 w-12 text-center text-xs text-gray-400 font-mono">#</th>
                 {Array.from({length: maxCols}).map((_, i) => (
                    <th key={i} className="p-3 border-b border-r border-gray-200 min-w-[150px] whitespace-nowrap">
                       {getColLabel(i)}
                    </th>
                 ))}
              </tr>
            </thead>
            <tbody>
              {sheetData.map((row, rowIndex) => (
                 <tr key={rowIndex} className="hover:bg-blue-50/30 border-b border-gray-100 last:border-0 bg-white">
                    <td className="p-2 border-r border-gray-100 bg-gray-50/50 text-xs text-center text-gray-400 font-mono select-none sticky left-0 align-top">{rowIndex + 1}</td>
                    {Array.from({length: maxCols}).map((_, colIndex) => (
                       <td key={colIndex} className="p-2 border-r border-gray-100 whitespace-pre-wrap break-words min-w-[150px] align-top">
                          {row && row[colIndex] !== undefined && row[colIndex] !== null ? String(row[colIndex]) : ''}
                       </td>
                    ))}
                 </tr>
              ))}
            </tbody>
         </table>
         {sheetData.length === 0 && <div className="p-8 text-center text-gray-400">Empty Sheet</div>}
      </div>
    </div>
  );
};

const TeamPerformanceChart: React.FC<{ data: any[] }> = ({ data }) => {
  const minItemWidth = 80;
  const calculatedWidth = data.length * minItemWidth;
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-[500px]">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Team Workload Analysis</h3>
      <div className="flex-1 w-full overflow-x-auto overflow-y-hidden pb-2">
        <div style={{ minWidth: '100%', width: Math.max(calculatedWidth, 600), height: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} interval={0} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
              <Legend verticalAlign="top" height={36} align="right" />
              <Bar dataKey="pure_commit" name="Pure Commits" fill={COLORS.pure_commit} radius={[4, 4, 0, 0]} barSize={24} />
              <Bar dataKey="code_review" name="Code Reviews" fill={COLORS.code_review} radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const ProjectDistributionChart: React.FC<{ data: any[] }> = ({ data }) => {
  const displayData = data.slice(0, 10);
  const otherCount = data.slice(10).reduce((acc, curr) => acc + curr.value, 0);
  if (otherCount > 0) displayData.push({ name: 'Others', value: otherCount });

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[500px] flex flex-col">
      <h3 className="text-lg font-semibold text-slate-800 mb-6">Project Distribution</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={displayData} cx="50%" cy="50%" labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                const radius = innerRadius + (outerRadius - innerRadius) * 0.65;
                const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                return percent > 0.05 ? <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight="bold">{`${(percent * 100).toFixed(0)}%`}</text> : null;
              }} outerRadius="80%" innerRadius="40%" paddingAngle={2} dataKey="value">
              {displayData.map((_, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="white" strokeWidth={2} />)}
            </Pie>
            <Tooltip />
            <Legend layout="vertical" verticalAlign="middle" align="right" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// --- Main View ---
export const CodeSubmissionView: React.FC = () => {
  const [dataStore, setDataStore] = useState<DataStore>({});
  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showRaw, setShowRaw] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAllCodeAnalysisReports().then(store => {
      setDataStore(store);
      const dates = Object.keys(store).sort((a, b) => b.localeCompare(a));
      if (dates.length > 0) setCurrentDate(dates[0]);
    });
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError(null);
    setIsLoading(true);

    let successCount = 0;
    const errors: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const report = await parseCodeSubmissionFile(file);
          await saveCodeAnalysisReport(report.date, report);
          successCount++;
        } catch (err: any) {
           console.error(`Error parsing ${file.name}:`, err);
           errors.push(`${file.name}: ${err.message || "Failed"}`);
        }
      }

      const store = await getAllCodeAnalysisReports();
      setDataStore(store);
      
      const sortedDates = Object.keys(store).sort((a, b) => b.localeCompare(a));
      if (sortedDates.length > 0 && !currentDate) {
         setCurrentDate(sortedDates[0]);
      }
      
      if (errors.length > 0) {
         setError(`Processed ${successCount}/${files.length}. Errors: ${errors.join('; ')}`);
      }

    } catch (err: any) {
      setError(err.message || "Failed to process files");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteReport = async (dateToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete report for ${dateToDelete}?`)) {
      await deleteCodeAnalysisReport(dateToDelete);
      const store = await getAllCodeAnalysisReports();
      setDataStore(store);
      if (currentDate === dateToDelete) {
        const remaining = Object.keys(store).sort((a, b) => b.localeCompare(a));
        setCurrentDate(remaining.length > 0 ? remaining[0] : null);
      }
    }
  };

  const sortedDates = Object.keys(dataStore).sort((a, b) => b.localeCompare(a));
  const activeReport = currentDate ? dataStore[currentDate] : undefined;
  const hasData = sortedDates.length > 0;

  return (
    <div className="flex h-full min-h-[calc(100vh-6rem)]">
      {/* Sidebar (In-page) */}
      <aside className={`bg-white border-r border-gray-200 flex flex-col shrink-0 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'w-64 translate-x-0 opacity-100' : 'w-0 -translate-x-full opacity-0 overflow-hidden'
        }`}>
        <div className="w-64 h-full flex flex-col p-4 gap-4">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
             <button onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-medium transition-all shadow-sm">
               {isLoading ? "Processing..." : <><UploadCloud size={18} /> Upload Analysis</>}
             </button>
             <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx,.xls" className="hidden" multiple />
             {error && <div className="mt-3 p-2 bg-red-50 text-red-600 text-xs rounded border border-red-100 flex gap-1 overflow-auto max-h-32"><AlertCircle size={14} className="shrink-0 mt-0.5" /><span>{error}</span></div>}
          </div>
          
          <div className="flex-1 overflow-y-auto">
             <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Report History</h3>
             {sortedDates.length === 0 ? <div className="text-sm text-gray-400 text-center py-4">No history</div> : (
               <div className="space-y-1">
                 {sortedDates.map(date => (
                   <div key={date} className="group relative">
                      <button onClick={() => { setCurrentDate(date); setShowRaw(false); }} className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${currentDate === date ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <div className="flex items-center gap-2"><Calendar size={14} />{date}</div>
                      </button>
                      <button onClick={(e) => handleDeleteReport(date, e)} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto bg-gray-50">
        <div className="flex items-center gap-4 mb-4 justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
            </button>
            {activeReport && (
                 <h2 className="text-2xl font-bold text-gray-800">
                    {showRaw ? '原始数据 (Raw Data)' : '代码提交数据分析'}
                 </h2>
            )}
          </div>
          {activeReport && activeReport.rawData && (
             <button 
               onClick={() => setShowRaw(!showRaw)} 
               className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
             >
               {showRaw ? <BarChart3 size={16} /> : <FileText size={16} />}
               {showRaw ? 'Show Charts' : 'Show Raw Data'}
             </button>
          )}
        </div>

        {!activeReport ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
             <BarChart3 size={48} className="mb-4 text-gray-300" />
             <p>Select a report or upload a new one.</p>
          </div>
        ) : (
          showRaw && activeReport.rawData ? (
              <div className="h-[calc(100vh-140px)] animate-in fade-in">
                 <RawDataViewer data={activeReport.rawData} />
              </div>
          ) : (
            <div className="space-y-6 animate-in fade-in">
               <header className="mb-2">
                  <p className="text-gray-500 text-sm">Report Date: {activeReport.date} | Source: {activeReport.fileName}</p>
               </header>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <TeamPerformanceChart data={activeReport.analysis} />
                 <ProjectDistributionChart data={activeReport.projects} />
               </div>
            </div>
          )
        )}
      </main>
    </div>
  );
};