import { Document, AccessLog } from '../types';

class DocumentStore {
  private documents: Document[] = [];
  private accessLogs: AccessLog[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const stored = localStorage.getItem('documentVault');
    if (stored) {
      const data = JSON.parse(stored);
      this.documents = data.documents?.map((doc: any) => ({
        ...doc,
        uploadedAt: new Date(doc.uploadedAt),
        lastAccessed: doc.lastAccessed ? new Date(doc.lastAccessed) : undefined,
        expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : undefined,
      })) || [];
      this.accessLogs = data.accessLogs?.map((log: any) => ({
        ...log,
        accessedAt: new Date(log.accessedAt),
      })) || [];
    }
  }

  private saveToStorage(): void {
    localStorage.setItem('documentVault', JSON.stringify({
      documents: this.documents,
      accessLogs: this.accessLogs,
    }));
  }

  addDocument(file: File): Document {
    const document: Document = {
      id: Math.random().toString(36).substring(2, 15),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date(),
      accessCount: 0,
      isShared: false,
      file,
    };
    
    this.documents.unshift(document);
    this.saveToStorage();
    return document;
  }

  getDocuments(): Document[] {
    return this.documents;
  }

  getDocument(id: string): Document | undefined {
    return this.documents.find(doc => doc.id === id);
  }

  updateDocument(id: string, updates: Partial<Document>): void {
    const index = this.documents.findIndex(doc => doc.id === id);
    if (index !== -1) {
      this.documents[index] = { ...this.documents[index], ...updates };
      this.saveToStorage();
    }
  }

  deleteDocument(id: string): void {
    this.documents = this.documents.filter(doc => doc.id !== id);
    this.accessLogs = this.accessLogs.filter(log => log.documentId !== id);
    this.saveToStorage();
  }

  logAccess(documentId: string, action: 'view' | 'download'): void {
    const log: AccessLog = {
      id: Math.random().toString(36).substring(2, 15),
      documentId,
      accessedAt: new Date(),
      ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
      userAgent: navigator.userAgent.split(' ')[0],
      location: 'Unknown',
      action,
    };

    this.accessLogs.unshift(log);
    
    // Update document access stats
    const document = this.getDocument(documentId);
    if (document) {
      this.updateDocument(documentId, {
        accessCount: document.accessCount + 1,
        lastAccessed: new Date(),
      });
    }
    
    this.saveToStorage();
  }

  getAccessLogs(documentId?: string): AccessLog[] {
    return documentId 
      ? this.accessLogs.filter(log => log.documentId === documentId)
      : this.accessLogs;
  }
}

export const documentStore = new DocumentStore();