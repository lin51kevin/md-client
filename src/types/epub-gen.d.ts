declare module 'epub-gen' {
  interface EpubOptions {
    title: string;
    author: string;
    language?: string;
    publisher?: string;
    description?: string;
    cover?: string;
    content: Array<{
      title: string;
      data: string;
    }>;
  }

  class EpubGen {
    constructor(options: EpubOptions, outputPath: string);
    generate(): Promise<void>;
  }

  export default EpubGen;
}
