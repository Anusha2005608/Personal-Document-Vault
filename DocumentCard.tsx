import React from 'react';
import { Share2, Download, Eye, Trash2, Clock, AlertTriangle } from 'lucide-react';
import { Document } from '../types';
import { formatFileSize, getFileIcon, isLinkExpired } from '../utils/fileUtils';

interface DocumentCardProps {
  document: Document;
  onShare: (doc: Document) => void;
  onViewLogs: (doc: Document) => void;
  onDelete: (doc: Document) => void;
  onDownload: (doc: Document) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onShare,
  onViewLogs,
  onDelete,
  onDownload,
}) => {
  const isExpired = document.expiryDate ? isLinkExpired(document.expiryDate) : false;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getFileIcon(document.type)}</span>
          <div>
            <h3 className="font-semibold text-gray-900 truncate max-w-xs">
              {document.name}
            </h3>
            <p className="text-sm text-gray-500">
              {formatFileSize(document.size)}
            </p>
          </div>
        </div>
        
        {document.isShared && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            isExpired 
              ? 'bg-red-100 text-red-700' 
              : 'bg-green-100 text-green-700'
          }`}>
            {isExpired ? (
              <>
                <AlertTriangle className="w-3 h-3" />
                Expired
              </>
            ) : (
              <>
                <Share2 className="w-3 h-3" />
                Shared
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex justify-between">
          <span>Uploaded:</span>
          <span>{document.uploadedAt.toLocaleDateString()}</span>
        </div>
        {document.lastAccessed && (
          <div className="flex justify-between">
            <span>Last accessed:</span>
            <span>{document.lastAccessed.toLocaleDateString()}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Access count:</span>
          <span className="font-medium">{document.accessCount}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onDownload(document)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Download
        </button>
        
        <button
          onClick={() => onShare(document)}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
        >
          <Share2 className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => onViewLogs(document)}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
        >
          <Eye className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => onDelete(document)}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};