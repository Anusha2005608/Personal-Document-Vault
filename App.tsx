import React, { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import { Document } from './types';
import { documentStore } from './store/documentStore';
import { Sidebar } from './components/Sidebar';
import { FileUpload } from './components/FileUpload';
import { DocumentCard } from './components/DocumentCard';
import { ShareModal } from './components/ShareModal';
import { AccessLogsModal } from './components/AccessLogsModal';
import { ActivityTab } from './components/ActivityTab';

function App() {
  const [activeTab, setActiveTab] = useState('documents');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [shareModalDoc, setShareModalDoc] = useState<Document | null>(null);
  const [logsModalDoc, setLogsModalDoc] = useState<Document | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = () => {
    setDocuments(documentStore.getDocuments());
  };

  const handleUpload = () => {
    loadDocuments();
  };

  const handleShare = (document: Document) => {
    setShareModalDoc(document);
  };

  const handleViewLogs = (document: Document) => {
    // Simulate some access logs for demo
    if (document.accessCount === 0) {
      documentStore.logAccess(document.id, 'view');
      documentStore.logAccess(document.id, 'download');
      loadDocuments();
    }
    setLogsModalDoc(document);
  };

  const handleDelete = (document: Document) => {
    if (confirm('Are you sure you want to delete this document?')) {
      documentStore.deleteDocument(document.id);
      loadDocuments();
    }
  };

  const handleDownload = (document: Document) => {
    documentStore.logAccess(document.id, 'download');
    
    if (document.file) {
      const url = URL.createObjectURL(document.file);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.name;
      link.click();
      URL.revokeObjectURL(url);
    }
    
    loadDocuments();
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || 
      (filterType === 'shared' && doc.isShared) ||
      (filterType === 'private' && !doc.isShared);
    
    return matchesSearch && matchesFilter;
  });

  const renderContent = () => {
    switch (activeTab) {
      case 'upload':
        return (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Documents</h2>
              <p className="text-gray-600">Add new documents to your secure vault</p>
            </div>
            <FileUpload onUpload={handleUpload} />
          </div>
        );
      
      case 'activity':
        return <ActivityTab />;
      
      case 'settings':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-600">Settings panel would go here with options for:</p>
              <ul className="mt-4 space-y-2 text-gray-600">
                <li>• Default link expiry times</li>
                <li>• Security preferences</li>
                <li>• Notification settings</li>
                <li>• Storage management</li>
              </ul>
            </div>
          </div>
        );
      
      default:
        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">My Documents</h2>
                <p className="text-gray-600">Manage your secure document vault</p>
              </div>
            </div>

            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Documents</option>
                <option value="shared">Shared Only</option>
                <option value="private">Private Only</option>
              </select>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📁</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No documents yet</h3>
                <p className="text-gray-600 mb-4">Upload your first document to get started</p>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Upload Document
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDocuments.map((document) => (
                  <DocumentCard
                    key={document.id}
                    document={document}
                    onShare={handleShare}
                    onViewLogs={handleViewLogs}
                    onDelete={handleDelete}
                    onDownload={handleDownload}
                  />
                ))}
              </div>
            )}

            {filteredDocuments.length === 0 && documents.length > 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No matching documents</h3>
                <p className="text-gray-600">Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 p-8">
        {renderContent()}
      </main>

      {shareModalDoc && (
        <ShareModal
          document={shareModalDoc}
          onClose={() => setShareModalDoc(null)}
          onUpdate={() => {
            loadDocuments();
            setShareModalDoc(null);
          }}
        />
      )}

      {logsModalDoc && (
        <AccessLogsModal
          document={logsModalDoc}
          onClose={() => setLogsModalDoc(null)}
        />
      )}
    </div>
  );
}

export default App;