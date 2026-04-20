import { X, Github, Globe, Bug } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { useI18n } from '../../i18n';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
}

const APP_NAME = 'MarkLite';
const HOMEPAGE_URL = 'https://github.com/lin51kevin/md-client';
const ISSUES_URL = 'https://github.com/lin51kevin/md-client/issues';
const USER_GUIDE_URL = 'https://github.com/lin51kevin/md-client/blob/main/docs/guides/USER_GUIDE.md';

const LICENSE_TEXT = `MIT License

Copyright (c) 2026 lin51kevin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

function openUrl(url: string) {
  import('@tauri-apps/plugin-opener')
    .then(m => m.openUrl(url))
    .catch(() => window.open(url, '_blank', 'noopener,noreferrer'));
}

export function AboutModal({ visible, onClose }: AboutModalProps) {
  const { t } = useI18n();
  const [version, setVersion] = useState('');

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion(''));
  }, []);

  if (!visible) return null;

  const appDesc = t('about.desc');

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg shadow-2xl flex flex-col overflow-hidden"
        style={{
          width: 440,
          maxHeight: '80vh',
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Title bar ── */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center gap-3">
            {/* App logo */}
            <img
              src="/logo.png"
              alt={APP_NAME}
              className="w-10 h-10 rounded select-none"
              draggable={false}
            />
            <div>
              <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                {APP_NAME}
              </h1>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {t('about.version')} {version}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--hover-bg)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 text-sm">
          {/* Description */}
          <p style={{ color: 'var(--text-secondary)' }}>{appDesc}</p>

          {/* Links */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              {t('about.links')}
            </h2>
            <LinkRow icon={<Globe size={14} />} label={t('about.homepage')} url={HOMEPAGE_URL} />
            <LinkRow icon={<Github size={14} />} label={t('about.userGuide')} url={USER_GUIDE_URL} />
            <LinkRow icon={<Bug size={14} />} label={t('about.reportIssue')} url={ISSUES_URL} />
          </div>

          {/* Built with */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
              {t('about.builtWith')}
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Tauri 2 &nbsp;·&nbsp; React 19 &nbsp;·&nbsp; CodeMirror 6 &nbsp;·&nbsp; Milkdown &nbsp;·&nbsp; Vite
            </p>
          </div>

          {/* License */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
              {t('about.license')}
            </h2>
            <div
              className="rounded p-3 text-xs font-mono overflow-y-auto"
              style={{
                maxHeight: 120,
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {LICENSE_TEXT}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="px-5 py-3 flex justify-end"
          style={{ borderTop: '1px solid var(--border-color)' }}
        >
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--hover-bg)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
          >
            {t('about.ok')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helper ──────────────────────────────────────────────────────────────────

function LinkRow({ icon, label, url }: { icon: React.ReactNode; label: string; url: string }) {
  return (
    <button
      className="flex items-center gap-2 text-sm transition-colors"
      style={{ color: 'var(--accent-color)' }}
      onClick={() => openUrl(url)}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      {icon}
      <span className="hover:underline">{label}</span>
    </button>
  );
}
