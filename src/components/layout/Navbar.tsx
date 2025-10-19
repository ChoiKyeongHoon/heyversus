"use client";

import { Session } from "@supabase/supabase-js";
import { User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  username: string | null;
  points: number;
  avatar_url?: string | null;
}

interface NavbarProps {
  session: Session | null;
  profile: Profile | null;
}

export default function Navbar({ session, profile }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("로그아웃되었습니다.");
    router.refresh(); // 세션이 변경되었으므로 페이지를 새로고침하여 서버 데이터를 다시 가져옵니다.
  };

  return (
    <nav className="flex justify-between items-center p-3 md:p-4 bg-transparent shadow-sm">
      <div className="flex items-center space-x-2 sm:space-x-4 md:space-x-8">
        <Link
          href="/"
          className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight hover:opacity-80 transition-opacity"
        >
          <span className="text-brand-gold">Hey</span>
          <span className="text-brand-orange">Versus</span>
        </Link>
        <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-4">
          <Link
            href="/"
            className="text-xs sm:text-sm md:text-base text-muted-foreground hover:text-foreground font-bold transition-colors"
          >
            HOME
          </Link>
          <span className="text-muted-foreground text-xs hidden sm:inline">|</span>
          <Link
            href="/polls"
            className="text-xs sm:text-sm md:text-base text-muted-foreground hover:text-foreground font-bold transition-colors"
          >
            POLLS
          </Link>
          <span className="text-muted-foreground text-xs hidden md:inline">|</span>
          <Link
            href="/favorites"
            className="hidden md:inline text-xs sm:text-sm md:text-base text-muted-foreground hover:text-foreground font-bold transition-colors"
          >
            FAVORITES
          </Link>
          <span className="text-muted-foreground text-xs hidden lg:inline">|</span>
          <Link
            href="/score"
            className="hidden lg:inline text-xs sm:text-sm md:text-base text-muted-foreground hover:text-foreground font-bold transition-colors"
          >
            SCORE
          </Link>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <ThemeToggle />
        {session ? (
          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4">
            {/* Profile Avatar & Info - Desktop */}
            <Link
              href="/account"
              className="hidden lg:flex items-center space-x-2 hover:opacity-80 transition-opacity"
              title="내 프로필"
            >
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.username || "프로필"}
                  width={32}
                  height={32}
                  className="rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-foreground text-xs font-medium truncate max-w-[120px]">
                  {profile?.username ?? session.user.email}
                </span>
                <span className="text-accent text-xs font-semibold">
                  {profile?.points ?? 0}XP
                </span>
              </div>
            </Link>

            {/* Mobile Profile Link */}
            <Link
              href="/account"
              className="lg:hidden"
              title="내 프로필"
            >
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.username || "프로필"}
                  width={32}
                  height={32}
                  className="rounded-full object-cover border-2 border-border min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
                />
              ) : (
                <div className="w-8 h-8 md:w-8 md:h-8 rounded-full bg-muted flex items-center justify-center border-2 border-border min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </Link>

            <Button
              asChild
              size="sm"
              className="text-xs md:text-sm px-2 sm:px-3 md:px-4 py-1.5 md:py-2 min-h-[44px] md:min-h-0"
            >
              <Link href="/create-poll">
                <span className="hidden sm:inline">투표 생성</span>
                <span className="sm:hidden">+</span>
              </Link>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleLogout}
              className="text-xs md:text-sm px-2 sm:px-3 md:px-4 py-1.5 md:py-2 min-h-[44px] md:min-h-0"
            >
              <span className="hidden sm:inline">로그아웃</span>
              <span className="sm:hidden">OUT</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Button
              asChild
              size="sm"
              className="text-xs md:text-sm px-2 sm:px-3 md:px-4 py-1.5 md:py-2 min-h-[44px] md:min-h-0"
            >
              <Link href="/signup">
                <span className="hidden sm:inline">회원가입</span>
                <span className="sm:hidden">JOIN</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="success"
              size="sm"
              className="text-xs md:text-sm px-2 sm:px-3 md:px-4 py-1.5 md:py-2 min-h-[44px] md:min-h-0"
            >
              <Link href={`/signin?redirect=${pathname}`}>
                <span className="hidden sm:inline">로그인</span>
                <span className="sm:hidden">IN</span>
              </Link>
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
