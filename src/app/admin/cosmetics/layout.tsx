
export default function CosmeticsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            {children}
        </div>
    );
}
