import { useEffect, useState } from 'react';
import 'react-quill/dist/quill.snow.css';
import 'react-quill/dist/quill.bubble.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  theme?: 'snow' | 'bubble';
  className?: string;
  modules?: any;
}

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder,
  readOnly = false,
  theme = 'snow',
  className = '',
  modules
}: RichTextEditorProps) {
  const [ReactQuill, setReactQuill] = useState<any>(null);

  useEffect(() => {
    // Dynamically import react-quill only on client side
    import('react-quill').then((mod) => {
      setReactQuill(() => mod.default);
    });

    // Inject custom styles for better toolbar visibility
    const styleId = 'rich-text-editor-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .rich-text-editor .ql-toolbar {
          background: hsl(var(--background)) !important;
          border: 1px solid hsl(var(--border)) !important;
          border-bottom: none !important;
          border-radius: 6px 6px 0 0 !important;
        }
        
        .rich-text-editor .ql-container {
          background: hsl(var(--background)) !important;
          border: 1px solid hsl(var(--border)) !important;
          border-top: none !important;
          border-radius: 0 0 6px 6px !important;
          color: hsl(var(--foreground)) !important;
        }
        
        .rich-text-editor .ql-toolbar .ql-stroke {
          stroke: hsl(var(--foreground)) !important;
        }
        
        .rich-text-editor .ql-toolbar .ql-fill {
          fill: hsl(var(--foreground)) !important;
        }
        
        .rich-text-editor .ql-toolbar button:hover {
          background: hsl(var(--accent)) !important;
        }
        
        .rich-text-editor .ql-toolbar button.ql-active {
          background: hsl(var(--primary)) !important;
          color: hsl(var(--primary-foreground)) !important;
        }
        
        .rich-text-editor .ql-editor {
          color: hsl(var(--foreground)) !important;
          min-height: 120px;
        }
        
        .rich-text-editor .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground)) !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const defaultModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ],
  };

  if (!ReactQuill) {
    return (
      <div className={`min-h-[100px] bg-background rounded-md border border-input animate-pulse ${className}`}>
        <div className="p-4 text-muted-foreground">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className={`rich-text-editor ${className}`}>
      <ReactQuill
        theme={theme}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        modules={modules || defaultModules}
      />
    </div>
  );
}