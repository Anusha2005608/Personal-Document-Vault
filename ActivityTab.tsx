import React from 'react';
import { Activity, TrendingUp, Eye, Download, Clock } from 'lucide-react';
import { documentStore } from '../store/documentStore';

export const ActivityTab: React.FC = () => {
  const logs = documentStore.getAccessLogs();
  const documents = documentStore.getDocuments();
  
  const recentLogs = logs.slice(0, 10);
  const totalViews = logs.filter(log => log.action === 'view').length;
  const totalDownloads = logs.filter(log => log.action === 'download').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Activity Overview</h2>
        <p className="text-gray-600">Monitor document access and sharing activity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Documents</p>
              <p className="text-3xl font-bold text-gray-900">{documents.length}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Views</p>
              <p className="text-3xl font-bold text-green-600">{totalViews}</p>
            </div>
            <Eye className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Downloads</p>
              <p className="text-3xl font-bold text-purple-600">{totalDownloads}</p>
            </div>
            <Download className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        
        <div className="p-6">
          {recentLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No recent activity</p>
              <p className="text-sm">Activity will appear here when documents are accessed</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentLogs.map((log) => {
                const document = documents.find(doc => doc.id === log.documentId);
                return (
                  <div key={log.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className={`p-2 rounded-full ${
                      log.action === 'view' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      {log.action === 'view' ? (
                        <Eye className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Download className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{document?.name || 'Unknown Document'}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          log.action === 'view' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {log.action}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {log.accessedAt.toLocaleString()} • {log.ipAddress}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};