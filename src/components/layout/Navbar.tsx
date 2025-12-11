"use client";

import { ListChecks, Trophy, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { CurrentProfile, useCurrentProfile } from "@/hooks/useCurrentProfile";
import { useSession } from "@/hooks/useSession";
import { createClient } from "@/lib/supabase/client";
import { getToast } from "@/lib/toast";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { session } = useSession();
  const { data: profileData } = useCurrentProfile(session?.user.id);
  const profile: CurrentProfile | null = profileData ?? null;
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    const toast = await getToast();
    toast.success("로그아웃되었습니다.");
    setProfileMenuOpen(false);
    router.push("/");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setProfileMenuOpen(false);
  }, [pathname]);

  return (
    <nav className="flex items-center justify-between gap-3 p-3 md:p-4 bg-transparent shadow-sm">
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight hover:opacity-80 transition-opacity"
        >
          <span className="text-brand-gold">Hey</span>
          <span className="text-brand-orange">Versus</span>
        </Link>
      </div>
      <div className="flex items-center space-x-2">
        <Link
          href="/polls"
          className="flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
          aria-label="전체 투표"
          title="전체 투표"
        >
          <ListChecks className="h-4 w-4" />
        </Link>
        <Link
          href="/score"
          className="flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
          aria-label="Score ranking"
          title="Score ranking"
        >
          <Trophy className="h-4 w-4" />
        </Link>
        <ThemeToggle />
        {session ? (
          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4">
            {/* Profile Avatar & Info - Desktop */}
            <div
              ref={profileMenuRef}
              className="relative flex items-center"
            >
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="flex items-center space-x-2 rounded-md px-2 py-1 hover:bg-accent/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-haspopup="menu"
                aria-expanded={isProfileMenuOpen}
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
                <div className="hidden lg:flex flex-col items-start">
                  <span className="text-foreground text-xs font-medium truncate max-w-[140px]">
                    {profile?.username ?? session.user.email}
                  </span>
                  <span className="text-accent text-xs font-semibold">
                    {profile?.points ?? 0}XP
                  </span>
                </div>
                <span className="sr-only">프로필 메뉴 열기</span>
              </button>
              {isProfileMenuOpen ? (
                <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-md border border-border bg-background p-2 shadow-lg">
                  <div className="flex flex-col gap-1">
                    <Link
                      href="/account"
                      onClick={() => setProfileMenuOpen(false)}
                      className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
                    >
                      프로필
                    </Link>
                    <Link
                      href="/favorites"
                      onClick={() => setProfileMenuOpen(false)}
                      className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
                    >
                      즐겨찾기
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="block rounded-md px-3 py-2 text-left text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
                    >
                      로그아웃
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <Button
              asChild
              size="sm"
              className="inline-flex text-xs md:text-sm px-2 sm:px-3 md:px-4 py-1.5 md:py-2 min-h-[44px] md:min-h-0"
            >
              <Link href="/create-poll">
                <span className="hidden sm:inline">투표 생성</span>
                <span className="sm:hidden">+</span>
              </Link>
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
                <span>회원가입</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="success"
              size="sm"
              className="text-xs md:text-sm px-2 sm:px-3 md:px-4 py-1.5 md:py-2 min-h-[44px] md:min-h-0"
            >
              <Link href={`/signin?redirect=${pathname}`}>
                <span>로그인</span>
              </Link>
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
