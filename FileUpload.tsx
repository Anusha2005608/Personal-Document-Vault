import React, { useCallback, useState } from 'react';
import { Upload, File, X } from 'lucide-react';
import { documentStore } from '../store/documentStore';

interface FileUploadProps {
  onUpload: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUpload }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFiles = async (files: File[]) => {
    const fileNames = files.map(f => f.name);
    setUploadingFiles(fileNames);

    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    files.forEach(file => {
      documentStore.addDocument(file);
    });

    setUploadingFiles([]);
    onUpload();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  return (
    <div className="mb-8">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
          dragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Upload Documents
        </h3>
        <p className="text-gray-600">
          Drag and drop files here, or <span className="text-blue-600">browse</span>
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Supports PDF, images, documents, and more
        </p>
      </div>

      {uploadingFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadingFiles.map((fileName) => (
            <div key={fileName} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <File className="w-5 h-5 text-blue-600" />
              <span className="flex-1 text-sm font-medium">{fileName}</span>
              <div className="w-16 h-2 bg-blue-200 rounded-full overflow-hidden">
                <div className="w-full h-full bg-blue-600 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};