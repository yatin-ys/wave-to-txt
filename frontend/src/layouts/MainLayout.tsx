import type { ReactNode } from "react";
import { ModeToggle } from "@/components/mode-toggle";
import { AudioWaveform as Waveform } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b flex-shrink-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
                <Waveform className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">WaveToTxt</h1>
            </div>
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full min-h-[calc(100vh-8rem)]">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  );
};
