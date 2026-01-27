import React, { useState, useEffect, useMemo } from 'react';
import { LayoutGrid, FolderOpen, ChevronDown, ChevronRight, FileText, Trash2, Clock, Users, Calendar, PanelLeftClose, PanelLeftOpen, AlertCircle, Table, BarChart as ChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LabelList, PieChart, Pie, Cell, Legend } from 'recharts';
import { v4 as uuidv4 } from 'uuid';
import { parseProjectProgressFile, parseFilename } from '../services/parsers';
import { saveProjectReport, getAllProjectReports, deleteProjectReport, deleteProjectByName } from '../services/db';
import { ProjectReport, ProjectGroup, ParsedProjectData } from '../types';
import { UploadArea } from '../components/UploadArea';
import { RawDataViewer } from '../components/RawDataViewer';

// --- Utils ---
const groupReportsByProject = (reports: ProjectReport[]): ProjectGroup[] => {
  const groups: Record<string, ProjectReport[]> = {};
  reports.forEach(r => {
    if (!groups[r.projectName]) groups[r.projectName] = [];
    groups[r.projectName].push(r);
  });
  return Object.keys(groups).map(name => ({
    projectName: name,
    reports: groups[name].sort((a, b) => b.date.localeCompare(a.date))
  })).sort((a, b) => a.projectName.localeCompare(b.projectName));
};

// --- Components ---
const Sidebar: React.FC<{
  groups: ProjectGroup[];
  selectedId: string | null;
  onSelect: (r: ProjectReport) => void;
  onUpload: (f: File[]) => void;
  onDeleteProject: (name: string) => void;
  onDeleteReport: (id: string) => void;
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
}> = ({ groups, selectedId, onSelect, onUpload, onDeleteProject, onDeleteReport, isOpen, isLoading, error }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (name: string) => setExpanded(p => ({ ...p, [name]: !p[name] }));

  return (
    <aside className={`bg-white border-r border-gray-200 flex flex-col shrink-0 transition-all duration-300 ease-in-out ${
      isOpen ? 'w-64 translate-x-0 opacity-100' : 'w-0 -translate-x-full opacity-0 overflow-hidden'
    }`}>
      <div className="w-64 h-full flex flex-col p-4 gap-4">
       <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
          <UploadArea onFilesSelect={onUpload} isLoading={isLoading} title="Upload Analysis" description="Format: yyyy-mm-dd_ProjectName_analysis.xlsx" compact={true} />
          {error && <div className="mt-3 p-2 bg-red-50 text-red-600 text-xs rounded border border-red-100 flex gap-1 overflow-auto max-h-20"><AlertCircle size={14} className="shrink-0 mt-0.5" />{error}</div>}
       </div>
       
       <div className="flex-1 overflow-y-auto space-y-1">
          {groups.length === 0 && <div className="text-sm text-gray-400 text-center py-4">No projects</div>}
          {groups.map(group => (
            <div key={group.projectName}>
              <div onClick={() => toggle(group.projectName)} className="flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-50 cursor-pointer text-gray-700 group/item transition-colors">
                 <div className="flex items-center gap-2 overflow-hidden">
                    <FolderOpen size={16} className="text-blue-500 shrink-0" />
                    <span className="truncate">{group.projectName}</span>
                 </div>
                 <div className="flex items-center gap-1 text-gray-400">
                    <button onClick={(e) => { e.stopPropagation(); if(confirm('Delete project?')) onDeleteProject(group.projectName); }} className="p-1 opacity-0 group-hover/item:opacity-100 hover:text-red-500 transition-opacity"><Trash2 size={14} /></button>
                    {expanded[group.projectName] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                 </div>
              </div>
              {(expanded[group.projectName] || group.reports.some(r => r.id === selectedId)) && (
                 <div className="ml-3 pl-3 border-l border-gray-200 mt-1 space-y-1">
                    {group.reports.map(report => (
                       <div key={report.id} className="group/report relative flex items-center">
                          <button onClick={() => onSelect(report)} className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-colors ${selectedId === report.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                             <FileText size={12} /> {report.date}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); if(confirm('Delete report?')) onDeleteReport(report.id); }} className="absolute right-1 opacity-0 group-hover/report:opacity-100 hover:text-red-500 text-gray-400 transition-opacity"><Trash2 size={12} /></button>
                       </div>
                    ))}
                 </div>
              )}
            </div>
          ))}
       </div>
      </div>
    </aside>
  );
};

const Charts: React.FC<{ data: ParsedProjectData; projectName: string }> = ({ data, projectName }) => {
   const PIE_COLORS = { Completed: '#22c55e', 'In Progress': '#3b82f6', 'Not Started': '#9ca3af', Other: '#d1d5db' };
   const timeChartHeight = Math.max(400, data.memberTimeStats.length * 60);

   return (
     <div className="space-y-6">
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between h-full">
              <div><p className="text-slate-500 text-sm">Total Hours</p><p className="text-2xl font-bold text-slate-800">{data.totalTime.toFixed(1)}</p></div>
              <div className="p-3 bg-blue-50 rounded-full"><Clock className="text-blue-500" /></div>
           </div>
           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between h-full">
              <div><p className="text-slate-500 text-sm">Members</p><p className="text-2xl font-bold text-slate-800">{data.summary.length}</p></div>
              <div className="p-3 bg-indigo-50 rounded-full"><Users className="text-indigo-500" /></div>
           </div>
           {/* Pie Chart Mini */}
           <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm h-48 flex items-center">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie 
                        data={data.statusDistribution} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={40} 
                        outerRadius={70} 
                        dataKey="value" 
                        paddingAngle={5}
                        labelLine={false}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                          const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                          return percent > 0 ? (
                            <text x={x} y={y} fill="#000000" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
                              {`${(percent * 100).toFixed(0)}%`}
                            </text>
                          ) : null;
                        }}
                     >
                        {data.statusDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={(PIE_COLORS as any)[entry.name] || '#ccc'} strokeWidth={0} />)}
                     </Pie>
                     <RechartsTooltip />
                     <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={8} wrapperStyle={{fontSize: '11px', right: 0}} />
                  </PieChart>
               </ResponsiveContainer>
           </div>
        </div>

        {/* Detailed Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {/* Delivery Wait Rate */}
           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-[400px]">
              <h3 className="font-bold text-slate-800 mb-4">Delivery Wait Rate</h3>
              <ResponsiveContainer width="100%" height="90%">
                 <BarChart data={data.summary} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="Member" fontSize={12} tickLine={false} />
                    <YAxis fontSize={12} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} formatter={(val: any) => Number(val).toFixed(2)} />
                    <Bar dataKey="DeliveryWaitRate" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40}>
                       <LabelList dataKey="DeliveryWaitRate" position="top" fill="#334155" fontSize={12} formatter={(val: any) => Number(val).toFixed(2)} />
                    </Bar>
                 </BarChart>
              </ResponsiveContainer>
           </div>
           
           {/* Time Consumed */}
           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm" style={{ height: timeChartHeight }}>
              <h3 className="font-bold text-slate-800 mb-4">Total Time Consumed</h3>
              <ResponsiveContainer width="100%" height="90%">
                 <BarChart layout="vertical" data={data.memberTimeStats} margin={{ top: 5, right: 50, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" fontSize={12} width={80} axisLine={false} tickLine={false} interval={0} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24}>
                       <LabelList dataKey="value" position="right" fill="#334155" fontSize={12} />
                    </Bar>
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
     </div>
   );
}

// --- Main View ---
export const ProjectProgressView: React.FC = () => {
  const [reports, setReports] = useState<ProjectReport[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'chart' | 'raw'>('chart');
  
  useEffect(() => {
    getAllProjectReports().then(setReports);
  }, []);

  const projectGroups = useMemo(() => groupReportsByProject(reports), [reports]);
  const selectedReport = useMemo(() => reports.find(r => r.id === selectedId), [reports, selectedId]);

  const handleUpload = async (files: File[]) => {
    setIsLoading(true);
    setError(null);
    let successCount = 0;
    const errors: string[] = [];

    // Pre-fetch reports to deduplicate correctly across multiple files in the same batch
    // (though real-time update in loop is safer if many files overwrite each other)
    let currentReports = [...reports];

    for (const file of files) {
      const meta = parseFilename(file.name);
      if (!meta) {
        errors.push(`${file.name}: Invalid filename format`);
        continue;
      }
      
      try {
         const parsed = await parseProjectProgressFile(file);
         
         const existingReport = currentReports.find(r => r.projectName === meta.projectName && r.date === meta.date);
         const reportId = existingReport ? existingReport.id : uuidv4();
         
         const newReport: ProjectReport = { 
           id: reportId, 
           fileName: file.name, 
           projectName: meta.projectName, 
           date: meta.date, 
           data: parsed,
           rawSheets: parsed.rawSheets
         };
         
         await saveProjectReport(newReport);
         
         // Update local list to handle next iteration correctly if overwriting
         const idx = currentReports.findIndex(r => r.id === reportId);
         if (idx >= 0) currentReports[idx] = newReport;
         else currentReports.push(newReport);

         successCount++;
         // If this is the only one (or last successful one), select it
         if (files.length === 1 || successCount === 1) {
            setSelectedId(reportId);
         }
      } catch (e: any) {
         errors.push(`${file.name}: ${e.message}`);
      }
    }

    setReports(await getAllProjectReports());
    if (errors.length > 0) {
      setError(errors.join(' | '));
    }
    setIsLoading(false);
  };

  const handleDeleteProject = async (name: string) => {
     await deleteProjectByName(name);
     setReports(await getAllProjectReports());
     if (selectedReport?.projectName === name) setSelectedId(null);
  };

  const handleDeleteReport = async (id: string) => {
     await deleteProjectReport(id);
     setReports(await getAllProjectReports());
     if (selectedId === id) setSelectedId(null);
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-6rem)]">
      <Sidebar groups={projectGroups} selectedId={selectedId} onSelect={r => setSelectedId(r.id)} onUpload={handleUpload} onDeleteProject={handleDeleteProject} onDeleteReport={handleDeleteReport} isOpen={isSidebarOpen} isLoading={isLoading} error={error} />
      <main className="flex-1 p-6 bg-slate-50 overflow-y-auto flex flex-col">
        <div className="flex items-center gap-4 mb-4 justify-between shrink-0">
          <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              >
                {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
              </button>
              {selectedReport && (
               <div className="flex bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
                  <button 
                    onClick={() => setViewMode('chart')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all ${viewMode === 'chart' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                     <ChartIcon size={16} /> Charts
                  </button>
                  <button 
                    onClick={() => setViewMode('raw')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all ${viewMode === 'raw' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                     <Table size={16} /> Raw Data
                  </button>
               </div>
            )}
          </div>
        </div>
        
        {isLoading && !selectedReport && <div className="text-center text-indigo-600 mt-20">Processing...</div>}
        {selectedReport ? (
           <div className="flex-1 flex flex-col min-h-0 animate-in fade-in">
              <header className="mb-8 flex justify-between items-center shrink-0">
                 <div>
                    <h2 className="text-2xl font-bold text-slate-800">{selectedReport.projectName}</h2>
                    <p className="text-sm text-slate-500 flex items-center gap-2"><Calendar size={14} /> Report Date: {selectedReport.date}</p>
                 </div>
                 <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Project Analysis</span>
              </header>

              {viewMode === 'chart' ? (
                <div className="overflow-y-auto">
                    <Charts data={selectedReport.data} projectName={selectedReport.projectName} />
                </div>
              ) : (
                <div className="flex-1 min-h-0">
                    <RawDataViewer sheets={selectedReport.rawSheets || {}} />
                </div>
              )}
           </div>
        ) : (
           !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <LayoutGrid size={48} className="mb-4 text-slate-300" />
                <p>Select a project report from the sidebar</p>
            </div>
           )
        )}
      </main>
    </div>
  );
};
