import Image from 'next/image';
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
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
          <Image
            src="/Logo_Brown.png"
            alt="Oasis Lounge"
            width={400}
            height={150}
            style={{
              maxWidth: '100%',
              height: 'auto'
            }}
            priority
          />
        </div>

        <AuthForm />
      </div>


      <footer style={{ marginTop: 'auto', fontSize: '0.75rem', color: '#ccc' }}>
        &copy; {new Date().getFullYear()} Oasis Lounge
      </footer>
    </div >
  );
}
