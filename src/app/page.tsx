import { AuthForm } from '@/components/auth/AuthForm';

export default function Home() {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      backgroundColor: '#FCFBF9',
      backgroundImage: 'radial-gradient(circle at center, #fff 0%, #FCFBF9 100%)',
      padding: '2rem'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '500px',
        width: '100%'
      }}>
        <h1 style={{
          fontSize: '3.5rem',
          fontFamily: 'serif',
          color: '#8C7568',
          marginBottom: '0.5rem',
          fontWeight: 'normal'
        }}>Oasis Lounge</h1>

        <h2 style={{
          fontSize: '0.9rem',
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          color: '#8D8D8D',
          marginBottom: '4rem',
          fontWeight: 400
        }}>Pilates, Body & Beauty</h2>

        <AuthForm />
      </div>


      <footer style={{ marginTop: 'auto', fontSize: '0.75rem', color: '#ccc' }}>
        &copy; {new Date().getFullYear()} Oasis Lounge
      </footer>
    </div >
  );
}
