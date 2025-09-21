
export enum Language {
  EN = 'en',
  AR = 'ar',
}

export interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  base64: string;
  name: string;
  mimeType: string;
}

export interface Option {
  value: string;
  label: Record<Language, string>;
}
