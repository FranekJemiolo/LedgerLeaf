# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: filesystem-storage.spec.ts >> Filesystem Storage >> should load all expenses
- Location: tests/filesystem-storage.spec.ts:102:3

# Error details

```
FileSystemAccessError: No directory access granted
```

# Test source

```ts
  1   | export interface FileSystemHandle {
  2   |   getFileHandle(name: string): Promise<FileHandle>;
  3   |   getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandle>;
  4   |   removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  5   | }
  6   | 
  7   | export interface FileHandle {
  8   |   getFile(): Promise<File>;
  9   |   createWritable(options?: { keepExistingData?: boolean }): Promise<FileSystemWritableFileStream>;
  10  |   isSameEntry(other: FileHandle): Promise<boolean>;
  11  | }
  12  | 
  13  | export interface DirectoryHandle {
  14  |   getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandle>;
  15  |   getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandle>;
  16  |   removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  17  |   resolve(possibleDescendant?: FileSystemHandle): Promise<[string] | null>;
  18  | }
  19  | 
  20  | export interface FileSystemWritableFileStream extends WritableStream {
  21  |   seek(position: number): Promise<void>;
  22  |   truncate(size: number): Promise<void>;
  23  | }
  24  | 
  25  | export class FileSystemAccessError extends Error {
  26  |   constructor(message: string, public code: string) {
  27  |     super(message);
  28  |     this.name = 'FileSystemAccessError';
  29  |   }
  30  | }
  31  | 
  32  | export class FileSystemAccessService {
  33  |   private directoryHandle: DirectoryHandle | null = null;
  34  |   private isSupported: boolean = false;
  35  | 
  36  |   constructor() {
  37  |     this.isSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  38  |   }
  39  | 
  40  |   get supported(): boolean {
  41  |     return this.isSupported;
  42  |   }
  43  | 
  44  |   async requestDirectoryAccess(): Promise<boolean> {
  45  |     if (!this.isSupported) {
  46  |       throw new FileSystemAccessError('File System Access API not supported', 'UNSUPPORTED');
  47  |     }
  48  | 
  49  |     try {
  50  |       this.directoryHandle = await (window as any).showDirectoryPicker({
  51  |         mode: 'readwrite',
  52  |         startIn: 'documents'
  53  |       });
  54  |       return true;
  55  |     } catch (error) {
  56  |       if (error instanceof Error && error.name === 'AbortError') {
  57  |         return false;
  58  |       }
  59  |       const errorMessage = error instanceof Error ? error.message : String(error);
  60  |       throw new FileSystemAccessError(`Failed to access directory: ${errorMessage}`, 'ACCESS_DENIED');
  61  |     }
  62  |   }
  63  | 
  64  |   async verifyDirectoryAccess(): Promise<boolean> {
  65  |     if (!this.directoryHandle) {
  66  |       return false;
  67  |     }
  68  | 
  69  |     try {
  70  |       // Try to resolve the directory to verify we still have access
  71  |       await this.directoryHandle.resolve();
  72  |       return true;
  73  |     } catch (error) {
  74  |       this.directoryHandle = null;
  75  |       return false;
  76  |     }
  77  |   }
  78  | 
  79  |   async getDirectoryHandle(path: string, create: boolean = false): Promise<DirectoryHandle> {
  80  |     if (!this.directoryHandle) {
  81  |       throw new FileSystemAccessError('No directory access granted', 'NO_ACCESS');
  82  |     }
  83  | 
  84  |     const parts = path.split('/').filter(Boolean);
  85  |     let currentHandle = this.directoryHandle;
  86  | 
  87  |     for (const part of parts) {
  88  |       currentHandle = await currentHandle.getDirectoryHandle(part, { create });
  89  |     }
  90  | 
  91  |     return currentHandle;
  92  |   }
  93  | 
  94  |   async getFileHandle(path: string, create: boolean = false): Promise<FileHandle> {
  95  |     if (!this.directoryHandle) {
> 96  |       throw new FileSystemAccessError('No directory access granted', 'NO_ACCESS');
      |             ^ FileSystemAccessError: No directory access granted
  97  |     }
  98  | 
  99  |     const parts = path.split('/');
  100 |     const fileName = parts.pop()!;
  101 |     const directoryPath = parts.join('/');
  102 | 
  103 |     const directoryHandle = await this.getDirectoryHandle(directoryPath, create);
  104 |     return await directoryHandle.getFileHandle(fileName, { create });
  105 |   }
  106 | 
  107 |   async writeFile(path: string, content: string): Promise<void> {
  108 |     const fileHandle = await this.getFileHandle(path, true);
  109 |     const writable = await fileHandle.createWritable();
  110 |     
  111 |     try {
  112 |       await (writable as any).write(content);
  113 |     } finally {
  114 |       await writable.close();
  115 |     }
  116 |   }
  117 | 
  118 |   async readFile(path: string): Promise<string> {
  119 |     const fileHandle = await this.getFileHandle(path);
  120 |     const file = await fileHandle.getFile();
  121 |     return await file.text();
  122 |   }
  123 | 
  124 |   async deleteFile(path: string): Promise<void> {
  125 |     const parts = path.split('/');
  126 |     const fileName = parts.pop()!;
  127 |     const directoryPath = parts.join('/');
  128 | 
  129 |     const directoryHandle = await this.getDirectoryHandle(directoryPath);
  130 |     await directoryHandle.removeEntry(fileName);
  131 |   }
  132 | 
  133 |   async listFiles(directory: string = ''): Promise<string[]> {
  134 |     const directoryHandle = await this.getDirectoryHandle(directory);
  135 |     const files: string[] = [];
  136 | 
  137 |     for await (const entry of (directoryHandle as any).values()) {
  138 |       if (entry.kind === 'file') {
  139 |         files.push(entry.name);
  140 |       }
  141 |     }
  142 | 
  143 |     return files;
  144 |   }
  145 | 
  146 |   async fileExists(path: string): Promise<boolean> {
  147 |     try {
  148 |       await this.getFileHandle(path);
  149 |       return true;
  150 |     } catch (error) {
  151 |       return false;
  152 |     }
  153 |   }
  154 | 
  155 |   async createDirectory(path: string): Promise<void> {
  156 |     await this.getDirectoryHandle(path, true);
  157 |   }
  158 | 
  159 |   getDirectoryPath(): string | null {
  160 |     return this.directoryHandle ? 'app-data' : null;
  161 |   }
  162 | }
  163 | 
  164 | // Singleton instance
  165 | export const fileSystemAccessService = new FileSystemAccessService();
  166 | 
```