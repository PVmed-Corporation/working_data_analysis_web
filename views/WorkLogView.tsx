import React, { useState, useEffect, useMemo } from 'react';
import { UploadCloud, Calendar, SlidersHorizontal, User, Clock, AlignLeft, RefreshCw, Layers, FileSpreadsheet, Loader2 } from 'lucide-react';
import { parseWorkLogBuffer, aggregateWorkLogs } from '../services/parsers';
import { saveWorkLogs, getAllWorkLogs, clearWorkLogs } from '../services/db';
import { WeeklyRecord } from '../types';

// --- Shared Internal Components ---
const DateFilter: React.FC<{
  allDates: string[];
  onFilterChange: (s: string, e: string) => void;
  currentStart: string;
  currentEnd: string;
}> = ({ allDates, onFilterChange, currentStart, currentEnd }) => {
  const startIndex = useMemo(() => allDates.indexOf(currentStart), [allDates, currentStart]);
  const endIndex = useMemo(() => allDates.indexOf(currentEnd), [allDates, currentEnd]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>, isMin: boolean) => {
    const val = parseInt(e.target.value);
    if (isMin) onFilterChange(allDates[Math.min(val, endIndex)], currentEnd);
    else onFilterChange(currentStart, allDates[Math.max(val, startIndex)]);
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>, isStart: boolean) => {
    if (!e.target.value) return;
    if (isStart) onFilterChange(e.target.value, currentEnd);
    else onFilterChange(currentStart, e.target.value);
  };

  const percentLeft = (startIndex / (allDates.length - 1)) * 100 || 0;
  const percentRight = (endIndex / (allDates.length - 1)) * 100 || 100;

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
      <div className="flex items-center gap-2 text-gray-700 font-semibold border-b border-gray-100 pb-2 mb-4">
        <SlidersHorizontal className="w-5 h-5" /><span>Date Range Filter</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-2">
           <span className="text-sm text-gray-500">From:</span>
           <div className="relative">
             <Calendar className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
             <input type="date" value={currentStart} onChange={(e) => handleDateInputChange(e, true)} className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
           </div>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-sm text-gray-500">To:</span>
           <div className="relative">
             <Calendar className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
             <input type="date" value={currentEnd} onChange={(e) => handleDateInputChange(e, false)} className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
           </div>
        </div>
      </div>
      {allDates.length > 1 && (
        <div className="relative h-12 pt-6 w-full px-2">
          <div className="absolute top-1/2 left-0 w-full h-2 bg-gray-200 rounded-full -translate-y-1/2 overflow-hidden">
             <div className="absolute top-0 h-full bg-blue-500" style={{ left: `${percentLeft}%`, width: `${percentRight - percentLeft}%` }} />
          </div>
          <input type="range" min={0} max={allDates.length - 1} value={startIndex} onChange={(e) => handleSliderChange(e, true)} className="pointer-events-none absolute top-1/2 left-0 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md z-20" />
          <input type="range" min={0} max={allDates.length - 1} value={endIndex} onChange={(e) => handleSliderChange(e, false)} className="pointer-events-none absolute top-1/2 left-0 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md z-30" />
        </div>
      )}
    </div>
  );
};

const TimesheetTable: React.FC<{ data: any }> = ({ data }) => {
  const { summary, dates } = data;
  if (!summary || !summary.length) return null;

  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="sticky left-0 z-20 bg-gray-50 p-4 text-left font-semibold text-gray-700 border-r border-gray-200 w-[120px]" rowSpan={2}><div className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" />Name</div></th>
              {dates.map((date: string) => <th key={date} colSpan={2} className="p-3 text-center font-semibold text-gray-700 border-r border-gray-200 last:border-r-0 bg-blue-50/50 whitespace-nowrap">{date}</th>)}
              <th className="sticky right-0 z-20 bg-gray-50 p-4 text-center font-semibold text-gray-900 border-l border-gray-200 w-[100px]" rowSpan={2}>Weekly Total</th>
            </tr>
            <tr className="bg-gray-50 border-b border-gray-200">
              {dates.map((date: string) => (
                <React.Fragment key={`${date}-sub`}>
                  <th className="p-2 text-center text-xs font-medium text-gray-500 border-r border-gray-100 whitespace-nowrap"><div className="flex items-center justify-center gap-1"><Clock className="w-3 h-3" />Hrs</div></th>
                  <th className="p-2 text-left text-xs font-medium text-gray-500 border-r border-gray-200 min-w-[200px]"><div className="flex items-center gap-1"><AlignLeft className="w-3 h-3" />Content</div></th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.map((person: any, pIndex: number) => {
              const rowIndices = Array.from({ length: person.maxRows }, (_, i) => i);
              return rowIndices.map((rowIndex) => (
                <tr key={`${person.name}-row-${rowIndex}`} className="group hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-b-0">
                  {rowIndex === 0 && <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50 p-4 font-medium text-gray-900 border-r border-gray-200 align-top" rowSpan={person.maxRows}>{person.name}</td>}
                  {dates.map((date: string) => {
                    const tasks = person.records[date] || [];
                    const task = tasks[rowIndex];
                    return (
                      <React.Fragment key={`${person.name}-${date}-${rowIndex}`}>
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

const UploadArea: React.FC<{ onFilesSelect: (files: File[]) => void; isLoading: boolean }> = ({ onFilesSelect, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);
  return (
    <div onDragOver={(e)=>{e.preventDefault();setIsDragging(true)}} onDragLeave={(e)=>{e.preventDefault();setIsDragging(false)}} onDrop={(e)=>{e.preventDefault();setIsDragging(false);if(e.dataTransfer.files.length)onFilesSelect(Array.from(e.dataTransfer.files))}} className={`relative group cursor-pointer flex flex-col items-center justify-center w-full h-48 rounded-2xl border-2 border-dashed transition-all duration-300 ${isDragging?"border-blue-500 bg-blue-50/50":"border-gray-300 hover:border-gray-400 bg-white"}`}>
      <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".xlsx, .xls" onChange={(e)=>e.target.files?.length && onFilesSelect(Array.from(e.target.files))} disabled={isLoading} />
      <div className="flex flex-col items-center space-y-4 text-center p-6">
        <div className={`p-3 rounded-full ${isDragging?"bg-blue-100 text-blue-600":"bg-gray-100 text-gray-500"}`}>{isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <UploadCloud className="w-6 h-6" />}</div>
        <div><p className="text-base font-semibold text-gray-700">{isLoading ? "Processing..." : "Upload Weekly Reports"}</p><p className="text-xs text-gray-500">Supports .xlsx or .xls</p></div>
      </div>
    </div>
  );
};

// --- Main Work Log View ---
export const WorkLogView: React.FC = () => {
  const [allRecords, setAllRecords] = useState<WeeklyRecord[]>([]);
  const [displayData, setDisplayData] = useState<any | null>(null);
  const [allAvailableDates, setAllAvailableDates] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load from IndexedDB on mount
    getAllWorkLogs().then(records => {
      if (records.length > 0) {
        processLoadedRecords(records);
      }
    });
  }, []);

  const processLoadedRecords = (records: WeeklyRecord[]) => {
      records.sort((a, b) => a.date.localeCompare(b.date));
      setAllRecords(records);
      const dates = Array.from(new Set(records.map(r => r.date))).sort();
      setAllAvailableDates(dates);
      if (!startDate) setStartDate(dates[0]);
      if (!endDate) setEndDate(dates[dates.length - 1]);
  };

  const handleFilesProcess = async (files: File[]) => {
    setLoading(true);
    setError(null);
    try {
      const newRecords: WeeklyRecord[] = [];
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const records = parseWorkLogBuffer(buffer);
        newRecords.push(...records);
      }
      // Save to IndexedDB
      await saveWorkLogs(newRecords);
      // Refresh local state
      const existing = await getAllWorkLogs();
      processLoadedRecords(existing);
    } catch (err: any) {
      setError(err.message || "Failed to parse files.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const handleReset = async () => {
    await clearWorkLogs();
    setAllRecords([]);
    setDisplayData(null);
    setStartDate('');
    setEndDate('');
    setAllAvailableDates([]);
    setError(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
       <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileSpreadsheet className="text-blue-600" /> 工作日志数据分析
          </h2>
          {displayData && (
             <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors shadow-sm">
               <RefreshCw className="w-4 h-4" /> Reset Data
             </button>
          )}
       </div>

       {allRecords.length === 0 && !loading ? (
          <div className="max-w-xl mx-auto space-y-4 py-12">
             <div className="text-center space-y-2">
                <p className="text-gray-500">Upload standard ZenTao Excel exports to analyze weekly efforts.</p>
             </div>
             <UploadArea onFilesSelect={handleFilesProcess} isLoading={loading} />
             {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">{error}</div>}
          </div>
       ) : (
         <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            <div className="lg:col-span-1 space-y-4">
                 <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Dataset Info</h3>
                    <div className="flex items-center gap-2 mb-4">
                      <Layers className="w-5 h-5 text-blue-600" />
                      <span className="text-2xl font-bold text-gray-900">{allRecords.length}</span>
                      <span className="text-gray-500">Records</span>
                    </div>
                 </div>
                 <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-sm text-blue-800 mb-3 font-medium">Add more logs?</p>
                    <UploadArea onFilesSelect={handleFilesProcess} isLoading={loading} />
                 </div>
            </div>
            <div className="lg:col-span-3 space-y-6">
                <DateFilter allDates={allAvailableDates} currentStart={startDate} currentEnd={endDate} onFilterChange={(s, e) => { setStartDate(s); setEndDate(e); }} />
                {displayData && displayData.summary.length > 0 ? (
                   <TimesheetTable data={displayData} />
                ) : (
                   <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed text-gray-500">No records found for selected range.</div>
                )}
            </div>
         </div>
       )}
    </div>
  );
};