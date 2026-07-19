"use client";

import { DiffEditor } from '@monaco-editor/react';

interface DiffViewerProps {
  original: string;
  modified: string;
}

export default function DiffViewer({ original, modified }: DiffViewerProps) {
  const handleEditorDidMount = (editor: any, monaco: any) => {
    monaco.editor.defineTheme('querion-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '6366F1', fontStyle: 'bold' },
        { token: 'string', foreground: '10B981' },
        { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
        { token: 'number', foreground: 'F59E0B' },
      ],
      colors: {
        'editor.background': '#09090D',
        'editor.foreground': '#E2E8F0',
        'editorLineNumber.foreground': '#313143',
        'editorLineNumber.activeForeground': '#6366F1',
        'editor.lineHighlightBackground': '#1E1E2E',
        'editor.selectionBackground': '#2A2B3D',
        'editorCursor.foreground': '#6366F1',
      }
    });
  };

  return (
    <div className="h-[400px] w-full border border-[#232333]/85 rounded-xl overflow-hidden bg-[#09090D] flex flex-col shadow-inner">
      <DiffEditor
        height="100%"
        original={original}
        modified={modified}
        language="sql"
        theme="querion-dark"
        onMount={handleEditorDidMount}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          renderSideBySide: true,
          padding: { top: 12, bottom: 12 },
          wordWrap: 'on',
        }}
      />
    </div>
  );
}
