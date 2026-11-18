'use client';

import { useEffect, useRef } from 'react';

/**
 * Wrap the content of a page that is shown inside an iframe on the WordPress site.
 * Reports the content height to the parent page so the frame can grow and shrink with it
 * (the parent runs the small 'oasis-embed-height' listener from docs/).
 *
 * The content is measured, not the document: once the frame has grown, the document can
 * never report a smaller height again. flow-root keeps child margins inside the box.
 */
export function EmbedAutoHeight({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el || window.parent === window) return;

        const report = () => {
            const rect = el.getBoundingClientRect();
            const height = Math.ceil(rect.bottom + window.scrollY + 12);
            window.parent.postMessage({ type: 'oasis-embed-height', height }, '*');
        };

        report();
        const observer = new ResizeObserver(report);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return <div ref={ref} style={{ display: 'flow-root' }}>{children}</div>;
}
