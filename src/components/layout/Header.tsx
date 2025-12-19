import { Music } from 'lucide-react';

export const Header = () => {
  return (
    <header className="border-b border-border bg-card">
      <div className="container flex h-16 items-center gap-3 px-4 md:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Music className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            Smart Media Converter
          </h1>
        </div>
      </div>
    </header>
  );
};
