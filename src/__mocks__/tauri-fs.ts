/** Stub for @tauri-apps/api/fs — unavailable in the test environment. */
export const readTextFile = async (): Promise<string> => '';
export const writeTextFile = async (): Promise<void> => {};
export const readBinaryFile = async (): Promise<Uint8Array> => new Uint8Array();
export const writeBinaryFile = async (): Promise<void> => {};
export const removeFile = async (): Promise<void> => {};
export const createDir = async (): Promise<void> => {};
export const removeDir = async (): Promise<void> => {};
export const readDir = async (): Promise<[]> => [];
export const exists = async (): Promise<boolean> => false;
export const copyFile = async (): Promise<void> => {};
export const renameFile = async (): Promise<void> => {};
