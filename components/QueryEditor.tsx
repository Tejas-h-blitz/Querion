"use client";

import Editor from '@monaco-editor/react';

interface QueryEditorProps {
  value: string;
  onChange?: (val: string) => void;
  readOnly?: boolean;
  onRun?: () => void;
}

export default function QueryEditor({ value, onChange, readOnly = false, onRun }: QueryEditorProps) {
  const handleEditorDidMount = (editor: any, monaco: any) => {
    monaco.editor.defineTheme('querion-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '7C6FE0', fontStyle: 'bold' },
        { token: 'string', foreground: '10B981' },
        { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
        { token: 'number', foreground: 'F59E0B' },
      ],
      colors: {
        'editor.background': '#0F0F15',
        'editor.foreground': '#E2E8F0',
        'editorLineNumber.foreground': '#313143',
        'editorLineNumber.activeForeground': '#7C6FE0',
        'editor.lineHighlightBackground': '#151520',
        'editor.selectionBackground': '#2A2B3D',
        'editorCursor.foreground': '#7C6FE0',
      }
    });
    
    monaco.editor.setTheme('querion-dark');
    
    if (onRun) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        onRun();
      });
    }
  };

  return (
    <div className="h-full w-full border border-[#232333] rounded-lg overflow-hidden bg-[#0F0F15] flex flex-col">
      <Editor
        height="100%"
        language="sql"
        theme="querion-dark"
        value={value}
        onChange={(val) => onChange?.(val || '')}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
          wordWrap: 'on',
        }}
      />
    </div>
  );
}
