import Logo from '@/components/logo';

export default function SubscriptionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-secondary p-4">
      <div className="absolute top-8">
        <Logo />
      </div>
      <div className="flex w-full max-w-4xl flex-col