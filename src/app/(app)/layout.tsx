import Header from './_components/header';
import BottomNav from './_components/bottom-nav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col bg-secondary">
      <Header />
      <main className="flex-1 overflow-y-auto pt-16 pb-24">
        <div className="container mx-auto max-w-3xl p-4">
            {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
