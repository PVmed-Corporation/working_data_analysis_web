import React, { useState, useEffect } from 'react';
import { Calendar, Trash2, AlertCircle, BarChart3, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { parseCodeSubmissionFile } from '../services/parsers';
import { saveCodeAnalysisReport, getAllCodeAnalysisReports, deleteCodeAnalysisReport } from '../services/db';
import { WeeklyReport, DataStore } from '../types';
import { UploadArea } from '../components/UploadArea';

// --- Shared Components ---
const COLORS = { pure_commit: '#3b82f6', code_review: '#22c55e' };
const PIE_COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316', '#eab308', '#84cc16', '#10b981', '#06b6d4', '#0ea5e9'];

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

  useEffect(() => {
    getAllCodeAnalysisReports().then(store => {
      setDataStore(store);
      const dates = Object.keys(store).sort((a, b) => b.localeCompare(a));
      if (dates.length > 0) setCurrentDate(dates[0]);
    });
  }, []);

  const handleFilesProcess = async (files: File[]) => {
    setError(null);
    setIsLoading(true);
    let successCount = 0;
    const errors: string[] = [];

    for (const file of files) {
       try {
         const report = await parseCodeSubmissionFile(file);
         await saveCodeAnalysisReport(report.date, report);
         successCount++;
       } catch (err: any) {
         errors.push(`${file.name}: ${err.message}`);
       }
    }

    if (successCount > 0) {
      const store = await getAllCodeAnalysisReports();
      setDataStore(store);
      // If no current date selected, select the latest
      if (!currentDate) {
        const dates = Object.keys(store).sort((a, b) => b.localeCompare(a));
        if (dates.length > 0) setCurrentDate(dates[0]);
      }
    }
    
    if (errors.length > 0) {
      setError(errors.join(' | '));
    }
    setIsLoading(false);
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

  return (
    <div className="flex h-full min-h-[calc(100vh-6rem)]">
      {/* Sidebar (In-page) */}
      <aside className={`bg-white border-r border-gray-200 flex flex-col shrink-0 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'w-64 translate-x-0 opacity-100' : 'w-0 -translate-x-full opacity-0 overflow-hidden'
        }`}>
        <div className="w-64 h-full flex flex-col p-4 gap-4">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
             <UploadArea onFilesSelect={handleFilesProcess} isLoading={isLoading} title="Upload Analysis" compact={true} />
             {error && <div className="mt-3 p-2 bg-red-50 text-red-600 text-xs rounded border border-red-100 flex gap-1 overflow-auto max-h-20"><AlertCircle size={14} className="shrink-0 mt-0.5" />{error}</div>}
          </div>
          
          <div className="flex-1 overflow-y-auto">
             <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Report History</h3>
             {sortedDates.length === 0 ? <div className="text-sm text-gray-400 text-center py-4">No history</div> : (
               <div className="space-y-1">
                 {sortedDates.map(date => (
                   <div key={date} className="group relative">
                      <button onClick={() => setCurrentDate(date)} className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${currentDate === date ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
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
          </div>
        </div>

        {!activeReport ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
             <BarChart3 size={48} className="mb-4 text-gray-300" />
             <p>Select a report or upload a new one.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in">
             <header className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">代码提交数据分析</h2>
                <p className="text-gray-500 text-sm">Report Date: {activeReport.date} | Source: {activeReport.fileName}</p>
             </header>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <TeamPerformanceChart data={activeReport.analysis} />
               <ProjectDistributionChart data={activeReport.projects} />
             </div>
          </div>
        )}
      </main>
    </div>
  );
};
