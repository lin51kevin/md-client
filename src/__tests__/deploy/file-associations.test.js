const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../..');
const tauriConf = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'src-tauri/tauri.conf.json'), 'utf-8')
);
const nsi = fs.readFileSync(path.join(rootDir, 'deploy/installer.nsi'), 'utf-8');

const EXPECTED_EXTS = ['md', 'markdown', 'mdown', 'mkd', 'mdx'];

describe('File Associations', () => {
  describe('Tauri config', () => {
    test('has fileAssociations in bundle', () => {
      expect(tauriConf.bundle.fileAssociations).toBeDefined();
      expect(tauriConf.bundle.fileAssociations).toHaveLength(1);
    });

    test('registers all expected extensions', () => {
      const assoc = tauriConf.bundle.fileAssociations[0];
      EXPECTED_EXTS.forEach((ext) => {
        expect(assoc.ext).toContain(ext);
      });
    });

    test('has correct mimeType', () => {
      const assoc = tauriConf.bundle.fileAssociations[0];
      expect(assoc.mimeType).toBe('text/markdown');
    });

    test('has Editor role', () => {
      const assoc = tauriConf.bundle.fileAssociations[0];
      expect(assoc.role).toBe('Editor');
    });
  });

  describe('NSIS installer', () => {
    EXPECTED_EXTS.forEach((ext) => {
      test(`registers .${ext} extension`, () => {
        expect(nsi).toMatch(new RegExp(`WriteRegStr HKCR "\\.${ext}"`));
      });
    });

    test('uses single prog id for all extensions', () => {
      expect(nsi).toMatch(/PROG_ID\s+"MarkLitePP\.Markdown"/);
      const matches = nsi.match(/WriteRegStr HKCR "\.\w+" "" "\$\{PROG_ID\}"/g);
      expect(matches).toHaveLength(EXPECTED_EXTS.length);
    });

    test('has DefaultIcon entry', () => {
      expect(nsi).toMatch(/DefaultIcon/);
    });

    test('cleans up all extensions on uninstall', () => {
      EXPECTED_EXTS.forEach((ext) => {
        expect(nsi).toMatch(new RegExp(`DeleteRegValue HKCR "\\.${ext}"`));
      });
      expect(nsi).toMatch(/DeleteRegKey HKCR "\$\{PROG_ID\}"/);
    });

    test('notifies shell of changes', () => {
      expect(nsi).toMatch(/SHChangeNotify/);
    });
  });
});
