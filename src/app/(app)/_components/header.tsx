import Logo from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-10 flex h-16 items-center justify-between border-b bg-secondary px-4 shadow-sm">
      <Logo />
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <Link href="/profile">
            <Avatar className="h-9 w-9 cursor-pointer">
              <AvatarImage src="https://placehold.co/40x40.png" alt="Avatar" data-ai-hint="profile person" />
              <AvatarFallback>CE</AvatarFallback>
            </Avatar>
        </Link>
      </div>
    </header>
  );
}
