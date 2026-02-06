import styles from '@/components/dashboard/VoucherDashboard.module.css';

export default function Loading() {
    return (
        <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '2rem 1rem',
            fontFamily: 'var(--font-geist-sans)'
        }}>
            {/* Header Skeleton */}
            <header style={{
                textAlign: 'center',
                marginBottom: '3rem',
                marginTop: '1rem'
            }}>
                <div className={styles.skeleton} style={{ height: '3rem', width: '300px', margin: '0 auto 0.5rem', borderRadius: '8px' }}></div>
                <div className={styles.skeleton} style={{ height: '1.2rem', width: '400px', margin: '0 auto', borderRadius: '4px' }}></div>

                <div style={{ marginTop: '1rem' }}>
                    <div className={styles.skeleton} style={{ height: '1rem', width: '100px', margin: '0 auto', background: 'transparent' }}></div>
                </div>
            </header>

            {/* Form Card Skeleton */}
            <div style={{
                background: '#fff',
                borderRadius: '16px',
                border: '1px solid #f0f0f0',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                padding: '2rem',
                maxWidth: '600px',
                margin: '0 auto'
            }}>
                <div className={styles.skeleton} style={{ height: '2rem', width: '200px', margin: '0 auto 2rem', borderRadius: '6px' }}></div>

                {/* Form Groups */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <div className={styles.skeleton} style={{ height: '1rem', width: '120px', marginBottom: '0.5rem' }}></div>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        <div className={styles.skeleton} style={{ height: '100px', borderRadius: '12px', border: '2px solid #e5e7eb' }}></div>
                        <div className={styles.skeleton} style={{ height: '100px', borderRadius: '12px', border: '2px solid #e5e7eb' }}></div>
                    </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <div className={styles.skeleton} style={{ height: '1rem', width: '150px', marginBottom: '0.5rem' }}></div>
                    <div className={styles.skeleton} style={{ height: '3rem', borderRadius: '8px' }}></div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <div className={styles.skeleton} style={{ height: '1rem', width: '200px', marginBottom: '0.5rem' }}></div>
                    <div className={styles.skeleton} style={{ height: '3rem', borderRadius: '8px' }}></div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <div className={styles.skeleton} style={{ height: '1rem', width: '150px', marginBottom: '0.5rem' }}></div>
                    <div className={styles.skeleton} style={{ height: '5rem', borderRadius: '8px' }}></div>
                </div>

                <div className={styles.skeleton} style={{ height: '3.5rem', borderRadius: '8px', marginTop: '2rem' }}></div>
            </div>

            <footer style={{
                textAlign: 'center',
                marginTop: '4rem',
                paddingTop: '2rem',
                borderTop: '1px solid #eee'
            }}>
                <div className={styles.skeleton} style={{ height: '1rem', width: '250px', margin: '0 auto' }}></div>
            </footer>
        </div>
    );
}
