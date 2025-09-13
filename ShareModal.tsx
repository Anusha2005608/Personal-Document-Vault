import React, { useState } from 'react';
import { X, Copy, Calendar, Shield, Eye, Download } from 'lucide-react';
import { Document, ShareSettings } from '../types';
import { documentStore } from '../store/documentStore';
import { generateShareLink } from '../utils/fileUtils';

interface ShareModalProps {
  document: Document;
  onClose: () => void;
  onUpdate: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ document, onClose, onUpdate }) => {
  const [settings, setSettings] = useState<ShareSettings>({
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    allowDownload: true,
    requirePassword: false,
  });
  const [shareLink, setShareLink] = useState(document.shareLink || '');
  const [copied, setCopied] = useState(false);

  const handleCreateLink = () => {
    const link = generateShareLink();
    setShareLink(link);
    
    documentStore.updateDocument(document.id, {
      isShared: true,
      shareLink: link,
      expiryDate: settings.expiryDate,
    });
    
    onUpdate();
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevokeLink = () => {
    documentStore.updateDocument(document.id, {
      isShared: false,
      shareLink: undefined,
      expiryDate: undefined,
    });
    setShareLink('');
    onUpdate();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Share Document</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <h3 className="font-medium text-gray-900 mb-2">{document.name}</h3>
          <p className="text-sm text-gray-600">
            Create a secure link to share this document with others
          </p>
        </div>

        {!shareLink ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Expiry Date
              </label>
              <input
                type="datetime-local"
                value={settings.expiryDate.toISOString().slice(0, 16)}
                onChange={(e) => setSettings({
                  ...settings,
                  expiryDate: new Date(e.target.value)
                })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.allowDownload}
                  onChange={(e) => setSettings({
                    ...settings,
                    allowDownload: e.target.checked
                  })}
                  className="rounded border-gray-300"
                />
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">Allow downloads</span>
                </div>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.requirePassword}
                  onChange={(e) => setSettings({
                    ...settings,
                    requirePassword: e.target.checked
                  })}
                  className="rounded border-gray-300"
                />
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">Require password</span>
                </div>
              </label>

              {settings.requirePassword && (
                <input
                  type="password"
                  placeholder="Enter password"
                  value={settings.password || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    password: e.target.value
                  })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}
            </div>

            <button
              onClick={handleCreateLink}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Create Share Link
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-md">
              <div className="flex items-center justify-between gap-2">
                <code className="text-sm text-gray-700 flex-1 truncate">
                  {shareLink}
                </code>
                <button
                  onClick={handleCopyLink}
                  className={`p-2 rounded-md transition-colors ${
                    copied 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {copied && (
              <div className="text-sm text-green-600 text-center">
                Link copied to clipboard!
              </div>
            )}

            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex items-center justify-between">
                <span>Expires:</span>
                <span>{settings.expiryDate.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Downloads:</span>
                <span>{settings.allowDownload ? 'Allowed' : 'View only'}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCopyLink}
                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Copy Link
              </button>
              <button
                onClick={handleRevokeLink}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
              >
                Revoke
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};