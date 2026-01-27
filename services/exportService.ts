import { WeeklyRecord } from '../types';

const IMPORT_MAP = `
{
  "imports": {
    "react": "https://esm.sh/react@18.2.0",
    "react-dom/client": "https://esm.sh/react-dom@18.2.0/client",
    "recharts": "https://esm.sh/recharts@2.12.0?external=react,react-dom",
    "lucide-react": "https://esm.sh/lucide-react@0.330.0?external=react,react-dom"
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

// --- Component Strings ---

const AGGREGATE_FUNC = `
const aggregateWorkLogs = (records) => {
  const datesSet = new Set();
  const personMap = {};

  records.forEach(r => {
    datesSet.add(r.date);
    if (!personMap[r.name]) personMap[r.name] = {};
    if (!personMap[r.name][r.date]) personMap[r.name][r.date] = [];
    
    personMap[r.name][r.date].push({
        time: r.time,
        content: r.content
    });
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
const { Calendar, SlidersHorizontal, User, Clock, AlignLeft, FileSpreadsheet } = lucide;

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

const ReportApp = () => {
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [displayData, setDisplayData] = React.useState(null);
  
  // RAW_DATA is injected by the exporter
  const allRecords = React.useMemo(() => RAW_DATA.sort((a,b) => a.date.localeCompare(b.date)), []);
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

  if (!displayData) return <div className="p-10 text-center">No Data</div>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
         <header className="mb-8">
             <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
               <FileSpreadsheet className="w-8 h-8 text-blue-600" /> Work Log Analysis Report
             </h1>
             <p className="text-gray-500 mt-2">Generated on {new Date().toLocaleDateString()}</p>
         </header>
         <DateFilter allDates={allAvailableDates} currentStart={startDate} currentEnd={endDate} onFilterChange={(s, e) => { setStartDate(s); setEndDate(e); }} />
         <TimesheetTable data={displayData} />
      </div>
    </div>
  );
};
`;

// --- Export Functions ---

export const exportWorkLogReport = (records: WeeklyRecord[]) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Work Log Analysis Report</title>
  ${BASE_STYLES}
  ${BASE_SCRIPTS}
</head>
<body class="bg-gray-50">
  <div id="root"></div>
  <script type="text/babel" data-type="module">
    import React from 'react';
    import ReactDOM from 'react-dom/client';
    import * as lucide from 'lucide-react';
    
    const RAW_DATA = ${JSON.stringify(records)};

    ${AGGREGATE_FUNC}
    ${WORKLOG_COMPONENTS}

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<ReportApp />);
  </script>
</body>
</html>`;
  
  downloadFile(`WorkLog_Report_${new Date().toISOString().split('T')[0]}.html`, html);
};
