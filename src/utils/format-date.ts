/** "Streda 24. septembra 2026" from a YYYY-MM-DD string, independent of the server timezone. */
export function formatDateSk(date: string) {
    const d = new Date(`${date}T12:00:00`);
    const s = d.toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
}
