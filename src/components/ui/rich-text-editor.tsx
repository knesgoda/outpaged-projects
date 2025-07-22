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
      <div className={`min-h-[100px] bg-muted/50 rounded-md border border-input animate-pulse ${className}`}>
        <div className="p-4 text-muted-foreground">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <ReactQuill
        theme={theme}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        modules={modules || defaultModules}
        style={{
          backgroundColor: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
        }}
      />
    </div>
  );
}