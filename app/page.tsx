'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/me', { credentials: 'include' })
      .then((res) => {
        router.replace(res.ok ? '/dashboard' : '/connexion');
      })
      .catch(() => router.replace('/connexion'));
  }, [router]);

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      <div className="text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <div className="mt-2">Chargement de NOVASYS...</div>
      </div>
    </div>
  );
}
