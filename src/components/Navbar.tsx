"use client";

import { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  username: string | null;
  points: number;
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
    <nav className="flex justify-between items-center p-4 bg-transparent shadow-sm">
      <div className="flex items-center space-x-4 md:space-x-8">
        <div className="text-2xl md:text-3xl font-bold tracking-tight">
          <span style={{ color: "#FFD700" }}>Hey</span>
          <span style={{ color: "#FF8C00" }}>Versus</span>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          <Link
            href="/"
            className="text-xs md:text-sm lg:text-base text-gray-300 hover:text-white font-bold"
          >
            HOME
          </Link>
          <span className="text-gray-500 text-xs">|</span>
          <Link
            href="/polls"
            className="text-xs md:text-sm lg:text-base text-gray-300 hover:text-white font-bold"
          >
            POLLS
          </Link>
          <span className="text-gray-500 text-xs">|</span>
          <Link
            href="/favorites"
            className="text-xs md:text-sm lg:text-base text-gray-300 hover:text-white font-bold"
          >
            FAVORITES
          </Link>
          <span className="text-gray-500 text-xs">|</span>
          <Link
            href="/score"
            className="text-xs md:text-sm lg:text-base text-gray-300 hover:text-white font-bold"
          >
            SCORE
          </Link>
        </div>
      </div>
      <div className="flex items-center">
        {session ? (
          <div className="flex items-center space-x-2 md:space-x-4">
            <span className="text-white text-sm md:text-base hidden sm:block">
              {profile?.username ?? session.user.email}
            </span>
            <span className="text-yellow-400 text-sm md:text-base font-semibold hidden sm:block">
              (XP: {profile?.points ?? 0})
            </span>
            <Button
              asChild
              className="text-xs md:text-sm px-2 md:px-4 py-1 md:py-2"
            >
              <Link href="/create-poll">투표 생성</Link>
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="text-xs md:text-sm px-2 md:px-4 py-1 md:py-2"
            >
              로그아웃
            </Button>
          </div>
        ) : (
          <div className="flex items-center space-x-1 md:space-x-2">
            <Button
              asChild
              className="text-xs md:text-sm px-2 md:px-4 py-1 md:py-2"
            >
              <Link href="/signup">회원가입</Link>
            </Button>
            <Button
              asChild
              variant="default"
              className="bg-success hover:bg-success/90 text-xs md:text-sm px-2 md:px-4 py-1 md:py-2"
            >
              <Link href={`/signin?redirect=${pathname}`}>로그인</Link>
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
