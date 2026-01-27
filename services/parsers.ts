import * as XLSX from 'xlsx';
import { WeeklyRecord, AnalysisRow, ProjectStat, WeeklyReport, ParsedProjectData, SummaryRow, DetailRow } from '../types';

// --- App 1: Work Log Parser ---
export const parseWorkLogBuffer = (buffer: ArrayBuffer): WeeklyRecord[] => {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

  const records: WeeklyRecord[] = [];
  let currentPerson = '';

  // Simple heuristic: assuming specific column layout based on standard ZenTao export
  // Or generic approach: Look for "Name" in col 0, "Date" in headers.
  // Implementing a robust generic parser matching the "Weekly Analysis" requirement.
  
  // Note: The prompt's original code for App 1 had `parseExcelBuffer`. 
  // I am reconstructing the likely logic for ZenTao format based on the prompt's `ParsedData` structure
  // which implies mapping (Name, Date, Time, Content).
  
  // Finding header row
  let headerRowIdx = 0;
  for(let i=0; i<jsonData.length; i++) {
     const row = jsonData[i];
     if (row.some((cell: any) => typeof cell === 'string' && cell.toLowerCase().includes('date'))) {
        headerRowIdx = i;
        break;
     }
  }

  // If strict format isn't guaranteed, we use a flattened approach often used in these apps:
  // Iterate rows. If Col 0 has value, it's name (merged cell logic). 
  // If not, use previous name.
  
  // Let's implement the logic implied by the prompt's App 1 `TimesheetTable`:
  // It expects `summary` and `dates`. The parsing logic happens before aggregation.
  // Re-implementing a robust version:
  
  const rawData = XLSX.utils.sheet_to_json(worksheet); 
  // Assuming keys like "Account", "Date", "Consumed", "Task" are present or similar.
  // Since I cannot see the exact input file, I will use a generic parser that looks for common fields.
  
  rawData.forEach((row: any) => {
      const name = row['Realname'] || row['Name'] || row['姓名'] || row['User'] || 'Unknown';
      const date = row['Date'] || row['日期'] || new Date().toISOString().split('T')[0];
      const time = row['Consumed'] || row['Time'] || row['工时'] || row['消耗'] || '0';
      const content = row['Task Name'] || row['Content'] || row['Work Content'] || row['任务'] || row['内容'] || '';
      
      records.push({
          name,
          date: String(date).trim(),
          time: String(time),
          content: String(content)
      });
  });

  return records;
};

export const aggregateWorkLogs = (records: WeeklyRecord[]) => {
  const datesSet = new Set<string>();
  const personMap: Record<string, Record<string, { time: number, content: string[] }>> = {};

  records.forEach(r => {
    datesSet.add(r.date);
    if (!personMap[r.name]) personMap[r.name] = {};
    if (!personMap[r.name][r.date]) personMap[r.name][r.date] = { time: 0, content: [] };
    
    personMap[r.name][r.date].time += parseFloat(r.time) || 0;
    if (r.content) personMap[r.name][r.date].content.push(r.content);
  });

  const dates = Array.from(datesSet).sort();
  const summary = Object.keys(personMap).map(name => {
    let totalHours = 0;
    let maxRows = 1;
    const rowData: Record<string, { time: string, content: string }[]> = {};

    dates.forEach(date => {
        const entry = personMap[name][date];
        if (entry) {
            totalHours += entry.time;
            // For display purposes, we might just join content, or keep distinct.
            // The UI expects an array of rows if content is split. 
            // Let's simplify: join content with newline.
            rowData[date] = [{
                time: entry.time.toFixed(1),
                content: entry.content.join('; ')
            }];
        } else {
            rowData[date] = [];
        }
    });

    return {
        name,
        totalHours,
        maxRows,
        records: rowData
    };
  });

  return { raw: records, summary, dates };
};


// --- App 2: Code Submission Parser ---
const normalizeKey = (key: string) => {
  if (!key) return '';
  return String(key).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
};

const findHeaderIndices = (headerRow: any[], targets: Record<string, string[]>) => {
  const indices: Record<string, number> = {};
  const normalizedHeaders = headerRow.map(h => normalizeKey(h));

  Object.keys(targets).forEach(key => {
    const targetAliases = targets[key];
    const index = normalizedHeaders.findIndex(h => targetAliases.includes(h));
    indices[key] = index;
  });
  return indices;
};

export const parseCodeSubmissionFile = async (file: File): Promise<WeeklyReport> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("File is empty");
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetNames = workbook.SheetNames;

        const analysisSheetName = sheetNames.find(n => normalizeKey(n).includes('analysis'));
        const dbSheetName = sheetNames.find(n => normalizeKey(n).includes('database'));

        if (!analysisSheetName) throw new Error("Missing 'analysis' sheet.");
        if (!dbSheetName) throw new Error("Missing 'database_1' sheet.");

        const analysisRaw = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[analysisSheetName], { header: 1 });
        let headerRowIndex = -1;
        let analysisIndices: Record<string, number> = {};

        for (let i = 0; i < Math.min(analysisRaw.length, 10); i++) {
          const row = analysisRaw[i];
          if (!row || row.length === 0) continue;
          const indices = findHeaderIndices(row, {
            name: ['person', 'name', '姓名', 'personnel', '人员', 'developer', 'employee'],
            pure_commit: ['purecommit', 'pure_commit', 'pure_commit', 'commit', '纯提交'],
            code_review: ['codereview', 'code_review', 'code_review', 'review', '代码评审', 'codereview']
          });
          if (indices.name !== -1 && (indices.pure_commit !== -1 || indices.code_review !== -1)) {
            headerRowIndex = i;
            analysisIndices = indices;
            break;
          }
        }

        if (headerRowIndex === -1) throw new Error("Could not find valid headers in Analysis sheet.");

        const analysisData: AnalysisRow[] = analysisRaw.slice(headerRowIndex + 1).map(row => {
          if (!row[analysisIndices.name]) return null;
          return {
            name: String(row[analysisIndices.name]).trim(),
            pure_commit: analysisIndices.pure_commit !== -1 ? (Number(row[analysisIndices.pure_commit]) || 0) : 0,
            code_review: analysisIndices.code_review !== -1 ? (Number(row[analysisIndices.code_review]) || 0) : 0,
          };
        }).filter((item): item is AnalysisRow => item !== null && item.name !== 'Unknown' && item.name !== '');

        const dbRaw = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[dbSheetName], { header: 1 });
        const projectCounts: Record<string, number> = {};
        let dbHeaderIndex = -1;
        let dbIndices: Record<string, number> = {};

        for (let i = 0; i < Math.min(dbRaw.length, 10); i++) {
          const row = dbRaw[i];
          if (!row || row.length === 0) continue;
          const indices = findHeaderIndices(row, {
            project: ['projectname', 'project_name', 'project', '项目名称', '项目']
          });
          if (indices.project !== -1) {
            dbHeaderIndex = i;
            dbIndices = indices;
            break;
          }
        }

        if (dbHeaderIndex !== -1) {
           dbRaw.slice(dbHeaderIndex + 1).forEach(row => {
             const val = row[dbIndices.project];
             if (val) {
               const pName = String(val).trim();
               if (pName) projectCounts[pName] = (projectCounts[pName] || 0) + 1;
             }
           });
        }

        const projectStats: ProjectStat[] = Object.entries(projectCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);

        const dateMatch = file.name.match(/(\d{4})[-._](\d{2})[-._](\d{2})/);
        const reportDate = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : new Date().toISOString().split('T')[0];

        resolve({
          date: reportDate,
          fileName: file.name,
          analysis: analysisData,
          projects: projectStats,
          timestamp: new Date(reportDate).getTime()
        });
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};


// --- App 3: Project Progress Parser ---
export const parseProjectProgressFile = async (file: File): Promise<ParsedProjectData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("File is empty");
        const workbook = XLSX.read(data, { type: 'binary' });

        if (!workbook.SheetNames.includes('summary') || !workbook.SheetNames.includes('details')) {
          throw new Error("Missing required sheets: 'summary' or 'details'");
        }

        const summarySheet = workbook.Sheets['summary'];
        const summaryRaw = XLSX.utils.sheet_to_json(summarySheet) as any[];
        
        const summary: SummaryRow[] = summaryRaw.map(row => {
          const memberKey = Object.keys(row).find(k => /member|name|姓名|组员/i.test(k)) || 'Member';
          const rateKey = Object.keys(row).find(k => /rate|delivery|wait|交付/i.test(k)) || 'DeliveryWaitRate';
          return {
            Member: row[memberKey] || 'Unknown',
            DeliveryWaitRate: row[rateKey] || 0,
            ...row 
          };
        });

        const detailsSheet = workbook.Sheets['details'];
        const detailsRaw = XLSX.utils.sheet_to_json(detailsSheet) as any[];

        let totalTime = 0;
        const statusCounts: Record<string, number> = { 'Completed': 0, 'In Progress': 0, 'Not Started': 0 };
        const memberTimeMap: Record<string, number> = {};

        const details: DetailRow[] = detailsRaw.map(row => {
           const taskKey = Object.keys(row).find(k => /主题|task|name|任务/i.test(k)) || 'TaskName';
           const timeKey = Object.keys(row).find(k => /总计消耗|total consumed/i.test(k)) || 
                           Object.keys(row).find(k => /time|consumed|hour|消耗/i.test(k)) || 'TimeConsumed';
           const memberKey = Object.keys(row).find(k => /指派给|assigned to/i.test(k)) ||
                             Object.keys(row).find(k => /member|assignee|owner|姓名|组员/i.test(k)) || 'Member';
           const statusKey = Object.keys(row).find(k => /status|state|状态/i.test(k)) || 'Status';

           const timeVal = parseFloat(row[timeKey]) || 0;
           totalTime += timeVal;

           let statusVal = row[statusKey] || 'Not Started';
           if (/completed|done|finished|已完成|关闭/i.test(statusVal)) statusVal = 'Completed';
           else if (/progress|running|ongoing|进行中/i.test(statusVal)) statusVal = 'In Progress';
           else statusVal = 'Not Started';

           if (statusCounts[statusVal] !== undefined) statusCounts[statusVal]++;
           else statusCounts['Not Started']++;

           const memberName = row[memberKey] || 'Unknown';
           if (!memberTimeMap[memberName]) memberTimeMap[memberName] = 0;
           memberTimeMap[memberName] += timeVal;

           return {
             TaskName: row[taskKey],
             TimeConsumed: timeVal,
             Status: statusVal,
             Member: memberName,
             ...row
           };
        });

        const statusDistribution = [
          { name: 'Completed', value: statusCounts['Completed'] },
          { name: 'In Progress', value: statusCounts['In Progress'] },
          { name: 'Not Started', value: statusCounts['Not Started'] },
        ];

        const memberTimeStats = Object.keys(memberTimeMap).map(key => ({
          name: key,
          value: parseFloat(memberTimeMap[key].toFixed(1))
        })).sort((a, b) => b.value - a.value);

        resolve({ summary, details, totalTime, statusDistribution, memberTimeStats });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsBinaryString(file);
  });
};

export const parseFilename = (filename: string) => {
  // Format: yyyy-mm-dd_ProjectName_analysis.xlsx
  const parts = filename.split('_');
  if (parts.length < 3) return null;
  const dateStr = parts[0];
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return null;
  const projectName = parts[1];
  return { date: dateStr, projectName };
};