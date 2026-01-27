import React, { useState, useMemo } from 'react';
import { Layers } from 'lucide-react';

interface RawDataViewerProps {
  sheets: Record<string, any[][]>;
}

export const RawDataViewer: React.FC<RawDataViewerProps> = ({ sheets }) => {
  const sheetNames = Object.keys(sheets);
  const [activeSheet, setActiveSheet] = useState(sheetNames[0] || '');

  // Effect to sync active sheet if props change or empty
  React.useEffect(() => {
     if (sheetNames.length > 0 && !sheets[activeSheet]) {
         setActiveSheet(sheetNames[0]);
     }
  }, [sheets, sheetNames, activeSheet]);

  const data = useMemo(() => {
      if (!activeSheet || !sheets[activeSheet]) return [];
      return sheets[activeSheet];
  }, [sheets, activeSheet]);

  // Calculate maximum columns to ensure grid alignment (prevent shifting due to empty trailing cells)
  const maxCols = useMemo(() => {
    return data.reduce((max, row) => Math.max(max, row ? row.length : 0), 0);
  }, [data]);

  const colIndices = useMemo(() => Array.from({ length: maxCols }, (_, i) => i), [maxCols]);

  if (!data || data.length === 0) return <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-200 border-dashed">No raw data available</div>;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in">
      {/* Sheet Tabs */}
      {sheetNames.length > 0 && (
        <div className="flex border-b border-gray-200 overflow-x-auto bg-gray-50/50">
          {sheetNames.map(name => (
             <button
               key={name}
               onClick={() => setActiveSheet(name)}
               className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
                 activeSheet === name 
                   ? 'border-blue-500 text-blue-600 bg-white' 
                   : 'border-transparent text-gray-600 hover:bg-gray-100/50 hover:text-gray-800'
               }`}
             >
               <Layers className="w-4 h-4" />
               {name}
             </button>
          ))}
        </div>
      )}
      
      {/* Data Table */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
             <tr>
               {colIndices.map((i) => {
                 const cell = data[0] ? data[0][i] : '';
                 return (
                    <th key={i} className="border-b border-gray-200 p-3 font-semibold text-gray-700 whitespace-nowrap min-w-[120px] bg-gray-50 border-r last:border-r-0 border-gray-200">
                      {String(cell !== null && cell !== undefined ? cell : '')}
                    </th>
                 );
               })}
             </tr>
          </thead>
          <tbody>
             {data.slice(1).map((row, rowIndex) => (
               <tr key={rowIndex} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors last:border-0 group">
                  {colIndices.map((colIndex) => {
                    const cell = row ? row[colIndex] : '';
                    return (
                        <td key={colIndex} className="p-3 border-r border-gray-100 last:border-r-0 text-gray-600 whitespace-pre-wrap max-w-xs break-words align-top">
                        {cell !== null && cell !== undefined ? String(cell) : ''}
                        </td>
                    );
                  })}
               </tr>
             ))}
             {data.length <= 1 && (
                <tr>
                    <td colSpan={maxCols || 1} className="p-8 text-center text-gray-400 italic">No data rows</td>
                </tr>
             )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
