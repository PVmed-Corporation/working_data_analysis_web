import React, { useState } from 'react';
import { Loader2, UploadCloud } from 'lucide-react';

interface UploadAreaProps {
  onFilesSelect: (files: File[]) => void;
  isLoading: boolean;
  accept?: string;
  title?: string;
  description?: string;
  compact?: boolean;
}

export const UploadArea: React.FC<UploadAreaProps> = ({ 
  onFilesSelect, 
  isLoading, 
  accept = ".xlsx, .xls",
  title = "Upload Analysis",
  description = "Supports .xlsx or .xls",
  compact = false
}) => {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div 
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length) {
          onFilesSelect(Array.from(e.dataTransfer.files));
        }
      }}
      className={`relative group cursor-pointer flex flex-col items-center justify-center w-full rounded-2xl border-2 border-dashed transition-all duration-300 ${
        isDragging ? "border-blue-500 bg-blue-50/50" : "border-gray-300 hover:border-gray-400 bg-white"
      } ${compact ? 'h-32' : 'h-40'}`}
    >
      <input 
        type="file" 
        multiple 
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
        accept={accept} 
        onChange={(e) => e.target.files?.length && onFilesSelect(Array.from(e.target.files))} 
        disabled={isLoading} 
      />
      <div className="flex flex-col items-center space-y-2 text-center p-4">
        <div className={`p-2 rounded-full ${isDragging ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700">
            {isLoading ? "Processing..." : title}
          </p>
          <p className="text-[10px] text-gray-500 mt-1 max-w-[200px] leading-tight">{description}</p>
        </div>
      </div>
    </div>
  );
};
