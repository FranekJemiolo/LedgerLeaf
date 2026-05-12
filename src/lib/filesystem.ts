export interface FileSystemHandle {
  getFileHandle(name: string): Promise<FileHandle>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandle>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
}

export interface FileHandle {
  getFile(): Promise<File>;
  createWritable(options?: { keepExistingData?: boolean }): Promise<FileSystemWritableFileStream>;
  isSameEntry(other: FileHandle): Promise<boolean>;
}

export interface DirectoryHandle {
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandle>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  resolve(possibleDescendant?: FileSystemHandle): Promise<[string] | null>;
}

export interface FileSystemWritableFileStream extends WritableStream {
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
}

export class FileSystemAccessError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'FileSystemAccessError';
  }
}

export class FileSystemAccessService {
  private directoryHandle: DirectoryHandle | null = null;
  private isSupported: boolean = false;

  constructor() {
    this.isSupported = 'showDirectoryPicker' in window;
  }

  get supported(): boolean {
    return this.isSupported;
  }

  async requestDirectoryAccess(): Promise<boolean> {
    if (!this.isSupported) {
      throw new FileSystemAccessError('File System Access API not supported', 'UNSUPPORTED');
    }

    try {
      this.directoryHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return false;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FileSystemAccessError(`Failed to access directory: ${errorMessage}`, 'ACCESS_DENIED');
    }
  }

  async verifyDirectoryAccess(): Promise<boolean> {
    if (!this.directoryHandle) {
      return false;
    }

    try {
      // Try to resolve the directory to verify we still have access
      await this.directoryHandle.resolve();
      return true;
    } catch (error) {
      this.directoryHandle = null;
      return false;
    }
  }

  async getDirectoryHandle(path: string, create: boolean = false): Promise<DirectoryHandle> {
    if (!this.directoryHandle) {
      throw new FileSystemAccessError('No directory access granted', 'NO_ACCESS');
    }

    const parts = path.split('/').filter(Boolean);
    let currentHandle = this.directoryHandle;

    for (const part of parts) {
      currentHandle = await currentHandle.getDirectoryHandle(part, { create });
    }

    return currentHandle;
  }

  async getFileHandle(path: string, create: boolean = false): Promise<FileHandle> {
    if (!this.directoryHandle) {
      throw new FileSystemAccessError('No directory access granted', 'NO_ACCESS');
    }

    const parts = path.split('/');
    const fileName = parts.pop()!;
    const directoryPath = parts.join('/');

    const directoryHandle = await this.getDirectoryHandle(directoryPath, create);
    return await directoryHandle.getFileHandle(fileName, { create });
  }

  async writeFile(path: string, content: string): Promise<void> {
    const fileHandle = await this.getFileHandle(path, true);
    const writable = await fileHandle.createWritable();
    
    try {
      await (writable as any).write(content);
    } finally {
      await writable.close();
    }
  }

  async readFile(path: string): Promise<string> {
    const fileHandle = await this.getFileHandle(path);
    const file = await fileHandle.getFile();
    return await file.text();
  }

  async deleteFile(path: string): Promise<void> {
    const parts = path.split('/');
    const fileName = parts.pop()!;
    const directoryPath = parts.join('/');

    const directoryHandle = await this.getDirectoryHandle(directoryPath);
    await directoryHandle.removeEntry(fileName);
  }

  async listFiles(directory: string = ''): Promise<string[]> {
    const directoryHandle = await this.getDirectoryHandle(directory);
    const files: string[] = [];

    for await (const entry of (directoryHandle as any).values()) {
      if (entry.kind === 'file') {
        files.push(entry.name);
      }
    }

    return files;
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      await this.getFileHandle(path);
      return true;
    } catch (error) {
      return false;
    }
  }

  async createDirectory(path: string): Promise<void> {
    await this.getDirectoryHandle(path, true);
  }

  getDirectoryPath(): string | null {
    return this.directoryHandle ? 'app-data' : null;
  }
}

// Singleton instance
export const fileSystemAccessService = new FileSystemAccessService();
