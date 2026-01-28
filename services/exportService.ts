import { WeeklyReport, WeeklyRecord, ParsedProjectData, DataStore, ProjectReport } from '../types';

// Import Map ensuring React 18+ and Recharts/Lucide compatibility
const IMPORT_MAP = `
{
  "imports": {
    "react": "https://esm.sh/react@18.3.1",
    "react-dom": "https://esm.sh/react-dom@18.3.1",
    "react-dom/client": "https://esm.sh/react-dom@18.3.1/client",
    "recharts": "https://esm.sh/recharts@2.12.7?external=react,react-dom",
    "lucide-react": "https://esm.sh/lucide-react@0.395.0?external=react"
  }
}
`;

const BASE_STYLES = `
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    body { font-family: 'Inter', sans-serif; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  </style>
`;

const BASE_SCRIPTS = `
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script type="importmap">${IMPORT_MAP}</script>
  <script>
    window.onerror = function(msg, url, line, col, error) {
      if (msg && msg.includes && msg.includes('module specifier')) {
         document.body.innerHTML = '<div style="padding:20px;color:red;font-family:sans-serif;"><h3>Export Error</h3><p>Failed to load modules from CDN. Please check your internet connection.</p><pre>' + msg + '</pre></div>';
      }
    };
  </script>
`;

const downloadFile = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// --- Shared Helper for raw data table ---
const RAW_DATA_VIEWER = `
const getColLabel = (index) => {
  let label = '';
  index++;
  while (index > 0) {
    const rem = (index - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    index = Math.floor((index - 1) / 26);
  }
  return label;
};

const RawDataViewer = ({ data }) => {
  const sheets = Object.keys(data);
  const [activeSheet, setActiveSheet] = React.useState(sheets[0]);
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
             className={\`px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors \${activeSheet === sheet ? 'bg-white text-indigo-700 font-semibold shadow-sm ring-1 ring-gray-200' : 'text-gray-600 hover:bg-white hover:text-gray-900'}\`}
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
`;

// --- Work Log Tab Components ---

const AGGREGATE_FUNC = `
const aggregateWorkLogs = (records) => {
  const datesSet = new Set();
  const personMap = {};
  records.forEach(r => {
    datesSet.add(r.date);
    if (!personMap[r.name]) personMap[r.name] = {};
    if (!personMap[r.name][r.date]) personMap[r.name][r.date] = [];
    personMap[r.name][r.date].push({ time: r.time, content: r.content });
  });
  const dates = Array.from(datesSet).sort();
  const summary = Object.keys(personMap).map(name => {
    let totalHours = 0;
    let maxRows = 0;
    const rowData = {};
    dates.forEach(date => {
        const entries = personMap[name][date] || [];
        rowData[date] = entries;
        if (entries.length > maxRows) maxRows = entries.length;
        entries.forEach(e => { totalHours += parseFloat(e.time) || 0; });
    });
    if (maxRows === 0) maxRows = 1;
    return { name, totalHours, maxRows, records: rowData };
  });
  return { raw: records, summary, dates };
};
`;

const WORKLOG_COMPONENTS = `
const DateFilter = ({ allDates, onFilterChange, currentStart, currentEnd }) => {
  const startIndex = allDates.indexOf(currentStart);
  const endIndex = allDates.indexOf(currentEnd);
  const handleSliderChange = (e, isMin) => {
    const val = parseInt(e.target.value);
    if (isMin) onFilterChange(allDates[Math.min(val, endIndex)], currentEnd);
    else onFilterChange(currentStart, allDates[Math.max(val, startIndex)]);
  };
  const percentLeft = (startIndex / (allDates.length - 1)) * 100 || 0;
  const percentRight = (endIndex / (allDates.length - 1)) * 100 || 100;
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4 mb-6">
      <div className="flex items-center gap-2 text-gray-700 font-semibold border-b border-gray-100 pb-2 mb-4">
        <SlidersHorizontal className="w-5 h-5" /><span>Date Range Filter</span>
      </div>
      <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
         <span>From: <b>{currentStart}</b></span>
         <span>To: <b>{currentEnd}</b></span>
      </div>
      {allDates.length > 1 && (
        <div className="relative h-12 pt-6 w-full px-2">
          <div className="absolute top-1/2 left-0 w-full h-2 bg-gray-200 rounded-full -translate-y-1/2 overflow-hidden">
             <div className="absolute top-0 h-full bg-blue-500" style={{ left: \`\${percentLeft}%\`, width: \`\${percentRight - percentLeft}%\` }} />
          </div>
          <input type="range" min={0} max={allDates.length - 1} value={startIndex} onChange={(e) => handleSliderChange(e, true)} className="pointer-events-none absolute top-1/2 left-0 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md z-20" />
          <input type="range" min={0} max={allDates.length - 1} value={endIndex} onChange={(e) => handleSliderChange(e, false)} className="pointer-events-none absolute top-1/2 left-0 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md z-30" />
        </div>
      )}
    </div>
  );
};

const TimesheetTable = ({ data }) => {
  const { summary, dates } = data;
  if (!summary || !summary.length) return null;
  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="sticky left-0 z-20 bg-gray-50 p-4 text-left font-semibold text-gray-700 border-r border-gray-200 w-[120px]" rowSpan={2}><div className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" />Name</div></th>
              {dates.map(date => <th key={date} colSpan={2} className="p-3 text-center font-semibold text-gray-700 border-r border-gray-200 last:border-r-0 bg-blue-50/50 whitespace-nowrap">{date}</th>)}
              <th className="sticky right-0 z-20 bg-gray-50 p-4 text-center font-semibold text-gray-900 border-l border-gray-200 w-[100px]" rowSpan={2}>Weekly Total</th>
            </tr>
            <tr className="bg-gray-50 border-b border-gray-200">
              {dates.map(date => (
                <React.Fragment key={\`\${date}-sub\`}>
                  <th className="p-2 text-center text-xs font-medium text-gray-500 border-r border-gray-100 whitespace-nowrap"><div className="flex items-center justify-center gap-1"><Clock className="w-3 h-3" />Hrs</div></th>
                  <th className="p-2 text-left text-xs font-medium text-gray-500 border-r border-gray-200 min-w-[200px]"><div className="flex items-center gap-1"><AlignLeft className="w-3 h-3" />Content</div></th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.map((person) => {
              const rowIndices = Array.from({ length: person.maxRows }, (_, i) => i);
              return rowIndices.map((rowIndex) => (
                <tr key={\`\${person.name}-row-\${rowIndex}\`} className="group hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-b-0">
                  {rowIndex === 0 && <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50 p-4 font-medium text-gray-900 border-r border-gray-200 align-top" rowSpan={person.maxRows}>{person.name}</td>}
                  {dates.map(date => {
                    const tasks = person.records[date] || [];
                    const task = tasks[rowIndex];
                    return (
                      <React.Fragment key={\`\${person.name}-\${date}-\${rowIndex}\`}>
                        <td className="p-2 text-center text-gray-600 border-r border-gray-100 font-mono align-top h-full">{task ? <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-bold text-xs">{task.time}</span> : null}</td>
                        <td className="p-2 text-left text-gray-600 border-r border-gray-200 text-xs leading-relaxed align-top whitespace-normal break-words">{task?.content || ''}</td>
                      </React.Fragment>
                    );
                  })}
                  {rowIndex === 0 && <td className="sticky right-0 z-10 bg-white group-hover:bg-gray-50 p-4 text-center font-bold text-blue-600 border-l border-gray-200 align-top" rowSpan={person.maxRows}>{person.totalHours.toFixed(1)} h</td>}
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const WorkLogTab = ({ data }) => {
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [displayData, setDisplayData] = React.useState(null);
  
  const allRecords = React.useMemo(() => data.sort((a,b) => a.date.localeCompare(b.date)), [data]);
  const allAvailableDates = React.useMemo(() => Array.from(new Set(allRecords.map(r => r.date))).sort(), [allRecords]);

  React.useEffect(() => {
     if (allAvailableDates.length > 0) {
        setStartDate(allAvailableDates[0]);
        setEndDate(allAvailableDates[allAvailableDates.length - 1]);
     }
  }, [allAvailableDates]);

  React.useEffect(() => {
    if (allRecords.length === 0) {
      setDisplayData(null);
      return;
    }
    const filtered = allRecords.filter(r => {
      const isAfterStart = !startDate || r.date >= startDate;
      const isBeforeEnd = !endDate || r.date <= endDate;
      return isAfterStart && isBeforeEnd;
    });
    if (filtered.length === 0) {
      setDisplayData({ raw: [], summary: [], dates: [] });
    } else {
      const aggregated = aggregateWorkLogs(filtered);
      setDisplayData(aggregated);
    }
  }, [allRecords, startDate, endDate]);

  if (!displayData) return <div className="p-10 text-center text-gray-400">No Work Log Data</div>;

  return (
    <div className="h-full overflow-y-auto p-6 md:p-8">
       <header className="mb-6">
           <h2 className="text-2xl font-bold text-gray-900">工作日志数据分析</h2>
           <p className="text-gray-500 text-sm">Analysis of weekly work efforts</p>
       </header>
       <DateFilter allDates={allAvailableDates} currentStart={startDate} currentEnd={endDate} onFilterChange={(s, e) => { setStartDate(s); setEndDate(e); }} />
       <TimesheetTable data={displayData} />
    </div>
  );
};
`;

// --- Code Analysis Tab Components ---

const CODE_COMPONENTS = `
const COLORS = { pure_commit: '#3b82f6', code_review: '#22c55e' };
const PIE_COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316', '#eab308', '#84cc16', '#10b981', '#06b6d4', '#0ea5e9'];

const CodeSidebar = ({ dates, currentDate, onSelect, isOpen }) => {
  return (
    <aside className={\`bg-white border-r border-gray-200 flex flex-col shrink-0 transition-all duration-300 ease-in-out \${
        isOpen ? 'w-64 translate-x-0 opacity-100' : 'w-0 -translate-x-full opacity-0 overflow-hidden'
      }\`}>
      <div className="w-64 h-full flex flex-col p-4 gap-4">
        <div className="flex-1 overflow-y-auto">
           <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Report History</h3>
           <div className="space-y-1">
             {dates.map(date => (
               <div key={date} className="group relative">
                  <button onClick={() => onSelect(date)} className={\`w-full text-left px-3 py-2 rounded-md text-sm transition-colors \${currentDate === date ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}\`}>
                    <div className="flex items-center gap-2"><Calendar size={14} />{date}</div>
                  </button>
               </div>
             ))}
           </div>
        </div>
      </div>
    </aside>
  );
};

const TeamPerformanceChart = ({ data }) => {
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

const ProjectDistributionChart = ({ data }) => {
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
                return percent > 0.05 ? <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight="bold">{\`\${(percent * 100).toFixed(0)}%\`}</text> : null;
              }} outerRadius="80%" innerRadius="40%" paddingAngle={2} dataKey="value">
              {displayData.map((_, index) => <Cell key={\`cell-\${index}\`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="white" strokeWidth={2} />)}
            </Pie>
            <Tooltip />
            <Legend layout="vertical" verticalAlign="middle" align="right" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const CodeAnalysisTab = ({ dataStore }) => {
  const dates = React.useMemo(() => Object.keys(dataStore).sort((a, b) => b.localeCompare(a)), [dataStore]);
  const [currentDate, setCurrentDate] = React.useState(dates.length > 0 ? dates[0] : null);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [showRaw, setShowRaw] = React.useState(false);

  const activeReport = currentDate ? dataStore[currentDate] : null;

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">
      <CodeSidebar dates={dates} currentDate={currentDate} onSelect={setCurrentDate} isOpen={isSidebarOpen} />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-4">
                   <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
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
                     {showRaw ? <BarChartIcon size={16} /> : <FileText size={16} />}
                     {showRaw ? 'Show Charts' : 'Show Raw Data'}
                   </button>
                 )}
            </div>
            {activeReport ? (
              showRaw && activeReport.rawData ? (
                 <div className="h-[calc(100vh-140px)]">
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
            ) : <div className="p-10 text-center text-gray-500">No report selected</div>}
        </div>
      </main>
    </div>
  );
};
`;

// --- Project Progress Tab Components ---

const PROJECT_COMPONENTS = `
const groupReportsByProject = (reports) => {
  const groups = {};
  reports.forEach(r => {
    if (!groups[r.projectName]) groups[r.projectName] = [];
    groups[r.projectName].push(r);
  });
  return Object.keys(groups).map(name => ({
    projectName: name,
    reports: groups[name].sort((a, b) => b.date.localeCompare(a.date))
  })).sort((a, b) => a.projectName.localeCompare(b.projectName));
};

const ProjectSidebar = ({ groups, selectedId, onSelect, isOpen }) => {
  const [expanded, setExpanded] = React.useState({});
  const toggle = (name) => setExpanded(p => ({ ...p, [name]: !p[name] }));

  return (
    <aside className={\`bg-white border-r border-gray-200 flex flex-col shrink-0 transition-all duration-300 ease-in-out \${
      isOpen ? 'w-64 translate-x-0 opacity-100' : 'w-0 -translate-x-full opacity-0 overflow-hidden'
    }\`}>
      <div className="w-64 h-full flex flex-col p-4 gap-4">
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
                    {expanded[group.projectName] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                 </div>
              </div>
              {(expanded[group.projectName] || group.reports.some(r => r.id === selectedId)) && (
                 <div className="ml-3 pl-3 border-l border-gray-200 mt-1 space-y-1">
                    {group.reports.map(report => (
                       <div key={report.id} className="group/report relative flex items-center">
                          <button onClick={() => onSelect(report)} className={\`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-colors \${selectedId === report.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}\`}>
                             <FileText size={12} /> {report.date}
                          </button>
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

const Charts = ({ data, projectName }) => {
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
           <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm h-48 flex items-center">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie data={data.statusDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={5} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                          const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                          return percent > 0 ? ( <text x={x} y={y} fill="#000000" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">{\`\${(percent * 100).toFixed(0)}%\`}</text>) : null;
                        }}>
                        {data.statusDistribution.map((entry, index) => <Cell key={\`cell-\${index}\`} fill={PIE_COLORS[entry.name] || '#ccc'} strokeWidth={0} />)}
                     </Pie>
                     <Tooltip />
                     <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={8} wrapperStyle={{fontSize: '11px', right: 0}} />
                  </PieChart>
               </ResponsiveContainer>
           </div>
        </div>

        {/* Detailed Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-[400px]">
              <h3 className="font-bold text-slate-800 mb-4">Delivery Wait Rate</h3>
              <ResponsiveContainer width="100%" height="90%">
                 <BarChart data={data.summary} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="Member" fontSize={12} tickLine={false} />
                    <YAxis fontSize={12} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val) => Number(val).toFixed(2)} />
                    <Bar dataKey="DeliveryWaitRate" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40}>
                       <LabelList dataKey="DeliveryWaitRate" position="top" fill="#334155" fontSize={12} formatter={(val) => Number(val).toFixed(2)} />
                    </Bar>
                 </BarChart>
              </ResponsiveContainer>
           </div>
           
           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm" style={{ height: timeChartHeight }}>
              <h3 className="font-bold text-slate-800 mb-4">Total Time Consumed</h3>
              <ResponsiveContainer width="100%" height="90%">
                 <BarChart layout="vertical" data={data.memberTimeStats} margin={{ top: 5, right: 50, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" fontSize={12} width={80} axisLine={false} tickLine={false} interval={0} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24}>
                       <LabelList dataKey="value" position="right" fill="#334155" fontSize={12} />
                    </Bar>
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
     </div>
   );
};

const ProjectProgressTab = ({ reports }) => {
  const [selectedId, setSelectedId] = React.useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [showRaw, setShowRaw] = React.useState(false);
  
  const projectGroups = React.useMemo(() => groupReportsByProject(reports), [reports]);
  
  React.useEffect(() => {
     if (!selectedId && projectGroups.length > 0 && projectGroups[0].reports.length > 0) {
        setSelectedId(projectGroups[0].reports[0].id);
     }
  }, [projectGroups]);

  const selectedReport = React.useMemo(() => {
     if (!selectedId) return null;
     for (const g of projectGroups) {
        const r = g.reports.find(x => x.id === selectedId);
        if (r) return r;
     }
     return null;
  }, [selectedId, projectGroups]);

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">
      <ProjectSidebar groups={projectGroups} selectedId={selectedId} onSelect={(r) => setSelectedId(r.id)} isOpen={isSidebarOpen} />
      <main className="flex-1 p-6 bg-slate-50 overflow-y-auto relative">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
              </button>
            </div>
            {selectedReport && selectedReport.data.rawData && (
               <button 
                 onClick={() => setShowRaw(!showRaw)} 
                 className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
               >
                 {showRaw ? <BarChartIcon size={16} /> : <FileText size={16} />}
                 {showRaw ? 'Show Charts' : 'Show Raw Data'}
               </button>
            )}
        </div>
        {selectedReport ? (
           showRaw && selectedReport.data.rawData ? (
              <div className="h-[calc(100vh-140px)] animate-in fade-in">
                 <h2 className="text-2xl font-bold text-slate-800 mb-4">原始数据 (Raw Data)</h2>
                 <RawDataViewer data={selectedReport.data.rawData} />
              </div>
           ) : (
             <div className="animate-in fade-in">
                <header className="mb-8 flex justify-between items-center">
                   <div>
                      <h2 className="text-2xl font-bold text-slate-800">{selectedReport.projectName}</h2>
                      <p className="text-sm text-slate-500 flex items-center gap-2"><Calendar size={14} /> Report Date: {selectedReport.date}</p>
                   </div>
                   <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Project Analysis</span>
                </header>
                <Charts data={selectedReport.data} projectName={selectedReport.projectName} />
             </div>
           )
        ) : (
           <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <LayoutGrid size={48} className="mb-4 text-slate-300" />
              <p>Select a project report from the sidebar</p>
           </div>
        )}
      </main>
    </div>
  );
};
`;

const DASHBOARD_COMPONENT = `
const DashboardApp = () => {
  const [currentView, setCurrentView] = React.useState('worklog');
  const { workLogs, codeReports, projectReports } = RAW_DATA;

  const navItems = [
    { id: 'worklog', label: '工作日志数据分析', icon: FileSpreadsheet },
    { id: 'code', label: '代码提交数据分析', icon: GitCommit },
    { id: 'project', label: '项目进度数据分析', icon: BarChart },
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-100">
       <nav className="bg-white border-b border-gray-200 shrink-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                 <div className="flex-shrink-0 flex items-center gap-2 text-indigo-600 font-bold text-xl mr-8">
                    <Layout className="w-6 h-6" />
                 </div>
                 <div className="hidden sm:flex sm:space-x-4">
                    {navItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setCurrentView(item.id)}
                        className={\`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium transition-colors duration-200 \${
                          currentView === item.id
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }\`}
                      >
                        <item.icon className="w-4 h-4 mr-2" />
                        {item.label}
                      </button>
                    ))}
                 </div>
              </div>
            </div>
          </div>
          <div className="sm:hidden flex border-t border-gray-100">
              {navItems.map((item) => (
                 <button
                   key={item.id}
                   onClick={() => setCurrentView(item.id)}
                   className={\`flex-1 flex flex-col items-center justify-center py-2 text-xs \${
                      currentView === item.id ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500'
                   }\`}
                 >
                    <item.icon className="w-5 h-5 mb-1" />
                    {item.label.split('数据')[0]}
                 </button>
              ))}
          </div>
       </nav>

       <div className="flex-1 overflow-hidden relative">
          {currentView === 'worklog' && <WorkLogTab data={workLogs} />}
          {currentView === 'code' && <CodeAnalysisTab dataStore={codeReports} />}
          {currentView === 'project' && <ProjectProgressTab reports={projectReports} />}
       </div>
    </div>
  );
};
`;

export const exportFullDashboard = (
  workLogs: WeeklyRecord[], 
  codeReports: DataStore, 
  projectReports: ProjectReport[]
) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Digital Dashboard</title>
  ${BASE_STYLES}
  ${BASE_SCRIPTS}
</head>
<body class="bg-gray-50">
  <div id="root"></div>
  <script type="text/babel" data-type="module">
    import React from 'react';
    import ReactDOM from 'react-dom/client';
    import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';
    import { 
      Layout, FileSpreadsheet, GitCommit, BarChart as BarChartIcon, 
      Calendar, SlidersHorizontal, User, Clock, AlignLeft, 
      PanelLeftClose, PanelLeftOpen, FolderOpen, ChevronDown, ChevronRight, FileText, LayoutGrid, Users 
    } from 'lucide-react';

    // Alias icons to avoid conflict with Recharts components or generic names
    const BarChart3 = BarChartIcon; 

    const RAW_DATA = {
       workLogs: ${JSON.stringify(workLogs)},
       codeReports: ${JSON.stringify(codeReports)},
       projectReports: ${JSON.stringify(projectReports)}
    };

    ${RAW_DATA_VIEWER}
    ${AGGREGATE_FUNC}
    ${WORKLOG_COMPONENTS}
    ${CODE_COMPONENTS}
    ${PROJECT_COMPONENTS}
    ${DASHBOARD_COMPONENT}

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<DashboardApp />);
  </script>
</body>
</html>`;

  downloadFile(`Digital_Dashboard_${new Date().toISOString().split('T')[0]}.html`, html);
};
