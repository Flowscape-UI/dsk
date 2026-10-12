export interface ProjectFile {
  path: string;
  language: string;
  code: string;
  html: string;
  description: { en: string; ru: string };
  binary?: boolean;
}

export interface ExampleProject {
  name: string;
  files: ProjectFile[];
  archive: string;
}
