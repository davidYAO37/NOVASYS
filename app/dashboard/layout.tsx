import Sidebar from '@/components/Sidebar';
import Verifconnecion from '@/components/verifconnecion';
import LicenceAlertBanner from '@/components/licence/LicenceAlertBanner';
import 'bootstrap/dist/css/bootstrap.min.css';

export const metadata = {
    title: 'NOVASYS — Tableau de bord',
    description: 'Interface de gestion commerciale NOVASYS',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <Verifconnecion>
            <div className="d-flex flex-column min-vh-100" style={{ minHeight: '100vh' }}>
                <div className="d-flex flex-column flex-md-row flex-grow-1">
                    <Sidebar />
                    <main className="flex-grow-1 p-3">
                        <LicenceAlertBanner />
                        {children}
                    </main>
                </div>
            </div>
        </Verifconnecion>
    );
}
