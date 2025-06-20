import type { ReactNode } from "react";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AudioWaveform as Waveform, LogOut, History, Upload, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

type AppPage = 'transcribe' | 'history' | 'details';

interface MainLayoutProps {
  children: ReactNode;
  currentPage?: AppPage;
  onNavigate?: (page: AppPage) => void;
  onShowAuth?: () => void;
}

export const MainLayout = ({ children, currentPage = 'transcribe', onNavigate, onShowAuth }: MainLayoutProps) => {
  const { user, signOut } = useAuth();

  const getInitials = (email: string) => {
    return email
      .split("@")[0]
      .split(".")
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const handleNavigateToTranscribe = () => {
    onNavigate?.('transcribe');
  };

  const handleNavigateToHistory = () => {
    onNavigate?.('history');
  };

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

            <div className="flex items-center space-x-4">
              {/* Navigation buttons */}
              {onNavigate && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant={currentPage === 'transcribe' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={handleNavigateToTranscribe}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Transcribe
                  </Button>
                  <Button
                    variant={currentPage === 'history' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={handleNavigateToHistory}
                  >
                    <History className="h-4 w-4 mr-2" />
                    History
                  </Button>
                </div>
              )}

              <ModeToggle />

              {!user && onShowAuth && (
                <Button onClick={onShowAuth} size="sm">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              )}

              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-8 w-8 rounded-full"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={user.user_metadata?.avatar_url}
                          alt={user.email || "User"}
                        />
                        <AvatarFallback>
                          {user.email ? getInitials(user.email) : "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {user.user_metadata?.full_name ||
                            user.email?.split("@")[0] ||
                            "User"}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {currentPage === 'history' || currentPage === 'details' ? (
          // Full width for history pages
          <div className="h-full min-h-[calc(100vh-8rem)]">
            {children}
          </div>
        ) : (
          // Two-column layout for transcribe page
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full min-h-[calc(100vh-8rem)]">
            {children}
          </div>
        )}
      </main>
    </div>
  );
};
