import React from 'react';
import { X, Eye, Download, MapPin, Clock } from 'lucide-react';
import { Document } from '../types';
import { documentStore } from '../store/documentStore';

interface AccessLogsModalProps {
  document: Document;
  onClose: () => void;
}

export const AccessLogsModal: React.FC<AccessLogsModalProps> = ({ document, onClose }) => {
  const logs = documentStore.getAccessLogs(document.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Access Logs</h2>
            <p className="text-sm text-gray-600">{document.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-4 text-center">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600">{document.accessCount}</div>
            <div className="text-sm text-gray-600">Total Access</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600">
              {logs.filter(log => log.action === 'view').length}
            </div>
            <div className="text-sm text-gray-600">Views</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-600">
              {logs.filter(log => log.action === 'download').length}
            </div>
            <div className="text-sm text-gray-600">Downloads</div>
          </div>
        </div>

        <div className="overflow-y-auto max-h-96">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Eye className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No access logs yet</p>
              <p className="text-sm">Logs will appear here when someone accesses your shared link</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {log.action === 'view' ? (
                        <Eye className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Download className="w-4 h-4 text-green-600" />
                      )}
                      <span className="font-medium capitalize">{log.action}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      {log.accessedAt.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">IP:</span>
                      <span className="font-mono">{log.ipAddress}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Browser:</span>
                      <span>{log.userAgent}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{log.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};