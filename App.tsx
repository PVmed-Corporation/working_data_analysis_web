import React, { useState } from 'react';
import { WorkLogView } from './views/WorkLogView';
import { CodeSubmissionView } from './views/CodeSubmissionView';
import { ProjectProgressView } from './views/ProjectProgressView';
import { FileSpreadsheet, GitCommit, BarChart, Layout, Download, Loader2 } from 'lucide-react';
import { getAllWorkLogs, getAllCodeAnalysisReports, getAllProjectReports } from './services/db';
import { exportFullDashboard } from './services/exportService';

type ViewType = 'worklog' | 'code' | 'project';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('worklog');
  const [isExporting, setIsExporting] = useState(false);

  const navItems: { id: ViewType; label: string; icon: React.ElementType }[] = [
    { id: 'worklog', label: '工作日志数据分析', icon: FileSpreadsheet },
    { id: 'code', label: '代码提交数据分析', icon: GitCommit },
    { id: 'project', label: '项目进度数据分析', icon: BarChart },
  ];

  const handleGlobalExport = async () => {
    setIsExporting(true);
    try {
      const [workLogs, codeReports, projectReports] = await Promise.all([
        getAllWorkLogs(),
        getAllCodeAnalysisReports(),
        getAllProjectReports()
      ]);
      exportFullDashboard(workLogs, codeReports, projectReports);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export dashboard data.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
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
                    className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium transition-colors duration-200 ${
                      currentView === item.id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center">
               <button 
                 onClick={handleGlobalExport} 
                 disabled={isExporting}
                 className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
               >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span className="hidden sm:inline">Export Dashboard</span>
               </button>
            </div>
          </div>
        </div>
        {/* Mobile Nav (Simple) */}
        <div className="sm:hidden flex border-t border-gray-100">
           {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex-1 flex flex-col items-center justify-center py-2 text-xs ${
                   currentView === item.id ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500'
                }`}
              >
                 <item.icon className="w-5 h-5 mb-1" />
                 {item.label.split('数据')[0]}
              </button>
           ))}
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {currentView === 'worklog' && (
           <div className="h-full w-full">
             <WorkLogView />
           </div>
        )}
        {currentView === 'code' && (
           <div className="h-full w-full">
             <CodeSubmissionView />
           </div>
        )}
        {currentView === 'project' && (
           <div className="h-full w-full">
             <ProjectProgressView />
           </div>
        )}
      </div>
    </div>
  );
};

export default App;
