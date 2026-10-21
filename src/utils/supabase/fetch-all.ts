// PostgREST silently caps any single select at 1000 rows (Supabase default). Tables that
// outgrow that — bookings already has ~2000 — must be read in pages, or the newest rows
// quietly disappear from lists, calendars and statistics.
const PAGE_SIZE = 1000;

export async function fetchAll<T>(
    build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>
): Promise<{ data: T[]; error: any }> {
    const all: T[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await build(from, from + PAGE_SIZE - 1);
        if (error) return { data: all, error };
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < PAGE_SIZE) break;
    }
    return { data: all, error: null };
}
