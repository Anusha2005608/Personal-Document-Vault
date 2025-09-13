export interface Document {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  lastAccessed?: Date;
  accessCount: number;
  isShared: boolean;
  shareLink?: string;
  expiryDate?: Date;
  file?: File;
}

export interface AccessLog {
  id: string;
  documentId: string;
  accessedAt: Date;
  ipAddress: string;
  userAgent: string;
  location: string;
  action: 'view' | 'download';
}

export interface ShareSettings {
  expiryDate: Date;
  allowDownload: boolean;
  requirePassword: boolean;
  password?: string;
}