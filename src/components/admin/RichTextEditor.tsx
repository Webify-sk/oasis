'use client';

import { useRef, useState } from 'react';
import {
    Bold, Italic, Underline, Heading2, List, ListOrdered,
    Link2, Image as ImageIcon, Eraser, Loader2, AlignLeft, AlignCenter
} from 'lucide-react';
import { uploadNewsletterImage } from '@/app/admin/newsletter/actions';

interface RichTextEditorProps {
    initialValue?: string;
    onChange: (html: string) => void;
}

export function RichTextEditor({ initialValue = '', onChange }: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const emit = () => {
        if (editorRef.current) onChange(editorRef.current.innerHTML);
    };

    // Run a formatting command while keeping focus/selection in the editor
    const exec = (command: string, value?: string) => {
        editorRef.current?.focus();
        document.execCommand(command, false, value);
        emit();
    };

    const handleLink = () => {
        const url = window.prompt('Zadajte URL odkazu:', 'https://');
        if (url) exec('createLink', url);
    };

    const handleImageClick = () => {
        fileInputRef.current?.click();
    };

    const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // allow re-selecting the same file
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Vyberte prosím obrázok.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('Obrázok je príliš veľký (max. 5 MB).');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);
            const res = await uploadNewsletterImage(formData);
            if (res?.error || !res?.url) {
                alert(res?.error || 'Nepodarilo sa nahrať obrázok.');
                return;
            }
            editorRef.current?.focus();
            document.execCommand(
                'insertHTML',
                false,
                `<img src="${res.url}" alt="" style="max-width:100%;height:auto;border-radius:8px;margin:12px 0;" /><br/>`
            );
            emit();
        } finally {
            setUploading(false);
        }
    };

    const btnStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '34px',
        height: '34px',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        backgroundColor: 'white',
        cursor: 'pointer',
        color: '#374151'
    };

    const ToolbarButton = ({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) => (
        <button
            type="button"
            title={title}
            onMouseDown={(e) => e.preventDefault()} // keep selection
            onClick={onClick}
            style={btnStyle}
        >
            {children}
        </button>
    );

    return (
        <div style={{ border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
            {/* Toolbar */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.4rem',
                padding: '0.6rem',
                backgroundColor: '#f9fafb',
                borderBottom: '1px solid #e5e7eb'
            }}>
                <ToolbarButton title="Tučné" onClick={() => exec('bold')}><Bold size={16} /></ToolbarButton>
                <ToolbarButton title="Kurzíva" onClick={() => exec('italic')}><Italic size={16} /></ToolbarButton>
                <ToolbarButton title="Podčiarknuté" onClick={() => exec('underline')}><Underline size={16} /></ToolbarButton>
                <ToolbarButton title="Nadpis" onClick={() => exec('formatBlock', 'h2')}><Heading2 size={16} /></ToolbarButton>
                <ToolbarButton title="Odrážkový zoznam" onClick={() => exec('insertUnorderedList')}><List size={16} /></ToolbarButton>
                <ToolbarButton title="Číslovaný zoznam" onClick={() => exec('insertOrderedList')}><ListOrdered size={16} /></ToolbarButton>
                <ToolbarButton title="Zarovnať vľavo" onClick={() => exec('justifyLeft')}><AlignLeft size={16} /></ToolbarButton>
                <ToolbarButton title="Zarovnať na stred" onClick={() => exec('justifyCenter')}><AlignCenter size={16} /></ToolbarButton>
                <ToolbarButton title="Vložiť odkaz" onClick={handleLink}><Link2 size={16} /></ToolbarButton>
                <ToolbarButton title="Vložiť obrázok" onClick={handleImageClick}>
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                </ToolbarButton>
                <ToolbarButton title="Odstrániť formátovanie" onClick={() => exec('removeFormat')}><Eraser size={16} /></ToolbarButton>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelected}
                    style={{ display: 'none' }}
                />
            </div>

            {/* Editable area */}
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={emit}
                dangerouslySetInnerHTML={{ __html: initialValue }}
                style={{
                    minHeight: '260px',
                    padding: '1rem',
                    fontSize: '0.95rem',
                    lineHeight: 1.6,
                    outline: 'none',
                    color: '#111827'
                }}
            />
        </div>
    );
}
