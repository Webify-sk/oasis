'use client';

import { useRef, useState, useEffect } from 'react';
import {
    Bold, Italic, Underline, Heading2, List, ListOrdered,
    Link2, Image as ImageIcon, Eraser, Loader2, AlignLeft, AlignCenter, Code
} from 'lucide-react';
import { uploadNewsletterImage } from '@/app/admin/newsletter/actions';

interface RichTextEditorProps {
    initialValue?: string;
    onChange: (html: string) => void;
}

// Allowlist used when cleaning pasted content (typically from Word/Google Docs).
const ALLOWED_TAGS = new Set([
    'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'H2', 'H3', 'UL', 'OL', 'LI', 'A', 'IMG'
]);
const ALLOWED_ATTRS: Record<string, string[]> = {
    A: ['href', 'target', 'rel'],
    IMG: ['src', 'alt', 'style']
};

function cleanHtml(dirty: string): string {
    const doc = document.implementation.createHTMLDocument('');
    doc.body.innerHTML = dirty;

    const walk = (node: Element) => {
        // Iterate over a copy — the list mutates while we unwrap/remove nodes.
        for (const child of Array.from(node.children)) {
            walk(child);

            if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE') {
                child.remove();
                continue;
            }

            if (!ALLOWED_TAGS.has(child.tagName)) {
                // Keep the text, drop the tag.
                child.replaceWith(...Array.from(child.childNodes));
                continue;
            }

            const allowed = ALLOWED_ATTRS[child.tagName] || [];
            for (const attr of Array.from(child.attributes)) {
                if (!allowed.includes(attr.name)) {
                    child.removeAttribute(attr.name);
                    continue;
                }
                if ((attr.name === 'href' || attr.name === 'src') &&
                    /^\s*javascript:/i.test(attr.value)) {
                    child.removeAttribute(attr.name);
                }
            }
        }
    };

    walk(doc.body);
    return doc.body.innerHTML;
}

// Photos straight from a phone are 2–8 MB; a server action accepts 1 MB by default and an
// e-mail should not carry more than a few hundred kB anyway. Shrink to a sensible width and
// re-encode as JPEG before uploading. createImageBitmap applies the EXIF rotation.
const MAX_IMAGE_WIDTH = 1200;

async function shrinkImage(file: File): Promise<File> {
    if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file; // keep animation / vectors

    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_IMAGE_WIDTH / bitmap.width);
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#ffffff'; // transparent PNG areas would turn black in JPEG
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
}

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

function ToolbarButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
    return (
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
}

export function RichTextEditor({ initialValue = '', onChange }: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [mode, setMode] = useState<'visual' | 'html'>('visual');
    const [htmlDraft, setHtmlDraft] = useState(initialValue);
    // Caret position at the moment the file dialog opens; the dialog steals focus, and
    // without this the picture landed at the very top of the e-mail.
    const savedRange = useRef<Range | null>(null);

    // Current content, kept outside React state on purpose — see the effect below.
    const valueRef = useRef(initialValue);

    // The editable area must stay OUT of React's control: React 19 rewrites
    // innerHTML on every re-render, so `dangerouslySetInnerHTML` here would wipe
    // out whatever the user had just typed. Seed it manually instead, once per
    // switch into visual mode.
    useEffect(() => {
        if (mode !== 'visual') return;
        const el = editorRef.current;
        if (el && el.innerHTML !== valueRef.current) {
            el.innerHTML = valueRef.current;
        }
    }, [mode]);

    const emit = () => {
        if (!editorRef.current) return;
        valueRef.current = editorRef.current.innerHTML;
        onChange(valueRef.current);
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

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        const html = e.clipboardData.getData('text/html');
        if (!html) return; // plain text pastes are fine as-is
        e.preventDefault();
        document.execCommand('insertHTML', false, cleanHtml(html));
        emit();
    };

    const switchMode = (next: 'visual' | 'html') => {
        if (next === mode) return;
        if (next === 'html') {
            setHtmlDraft(valueRef.current);
        } else {
            valueRef.current = htmlDraft;
            onChange(htmlDraft);
        }
        setMode(next);
    };

    const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setHtmlDraft(e.target.value);
        valueRef.current = e.target.value;
        onChange(e.target.value);
    };

    const handleImageClick = () => {
        const sel = window.getSelection();
        savedRange.current =
            sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)
                ? sel.getRangeAt(0).cloneRange()
                : null;
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
        if (file.size > 25 * 1024 * 1024) {
            alert('Obrázok je príliš veľký (max. 25 MB).');
            return;
        }

        setUploading(true);
        try {
            let toUpload = file;
            try {
                toUpload = await shrinkImage(file);
            } catch {
                // e.g. HEIC that this browser cannot decode — fall through with the original
            }
            if (toUpload.size > 900 * 1024) {
                alert('Tento obrázok sa nepodarilo zmenšiť. Skúste ho prosím uložiť ako JPG alebo PNG a nahrať znova.');
                return;
            }

            const formData = new FormData();
            formData.append('image', toUpload);
            const res = await uploadNewsletterImage(formData);
            if (res?.error || !res?.url) {
                alert(res?.error || 'Nepodarilo sa nahrať obrázok.');
                return;
            }
            editorRef.current?.focus();
            if (savedRange.current) {
                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(savedRange.current);
            }
            document.execCommand(
                'insertHTML',
                false,
                `<img src="${res.url}" alt="" style="max-width:100%;height:auto;border-radius:8px;margin:12px 0;" /><br/>`
            );
            emit();
        } catch (err) {
            // A thrown server action (network, size limit) used to vanish without a word.
            console.error('Newsletter image upload failed:', err);
            alert('Obrázok sa nepodarilo nahrať. Skontrolujte pripojenie a skúste to znova.');
        } finally {
            setUploading(false);
        }
    };

    const modeTabStyle = (active: boolean): React.CSSProperties => ({
        padding: '0.3rem 0.7rem',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        backgroundColor: active ? '#93745F' : 'white',
        color: active ? 'white' : '#374151',
        cursor: 'pointer',
        fontSize: '0.8rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem'
    });

    return (
        <div style={{ border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
            {/* Toolbar */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.4rem',
                padding: '0.6rem',
                backgroundColor: '#f9fafb',
                borderBottom: '1px solid #e5e7eb',
                alignItems: 'center'
            }}>
                {mode === 'visual' && (
                    <>
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
                    </>
                )}

                {/* Visual / HTML switch */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.3rem', flex: '0 0 auto' }}>
                    <button type="button" onClick={() => switchMode('visual')} style={modeTabStyle(mode === 'visual')}>
                        Text
                    </button>
                    <button type="button" onClick={() => switchMode('html')} style={modeTabStyle(mode === 'html')}>
                        <Code size={14} /> HTML
                    </button>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelected}
                    style={{ display: 'none' }}
                />
            </div>

            {/* Editable area */}
            {mode === 'visual' ? (
                <div
                    ref={editorRef}
                    contentEditable
                    onInput={emit}
                    onPaste={handlePaste}
                    style={{
                        minHeight: '260px',
                        padding: '1rem',
                        fontSize: '0.95rem',
                        lineHeight: 1.6,
                        outline: 'none',
                        color: '#111827'
                    }}
                />
            ) : (
                <textarea
                    value={htmlDraft}
                    onChange={handleHtmlChange}
                    spellCheck={false}
                    style={{
                        display: 'block',
                        width: '100%',
                        minHeight: '260px',
                        padding: '1rem',
                        border: 'none',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        fontSize: '0.85rem',
                        lineHeight: 1.6,
                        color: '#111827'
                    }}
                />
            )}
        </div>
    );
}
