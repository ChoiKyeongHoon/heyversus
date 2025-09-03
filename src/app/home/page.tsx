"use client";

import { useState } from "react";
import Link from "next/link";

// PlayerCard 컴포넌트: 개별 선수 정보를 표시하고 투표 기능을 가집니다.
// 나중에 선수 데이터는 외부에서 props로 받아오도록 수정할 수 있습니다.
function PlayerCard({
  name,
  imageUrl,
  onVote,
  votes,
}: {
  name: string;
  imageUrl: string;
  onVote: () => void;
  votes: number;
}) {
  return (
    <div className="flex flex-col items-center">
      <img
        src={imageUrl}
        alt={name}
        className="w-32 h-32 bg-gray-200 rounded-full mb-4 object-cover"
      />
      <h3 className="text-xl font-bold mb-2">{name}</h3>
      <button
        onClick={onVote}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        투표하기
      </button>
      <p className="mt-2">득표: {votes}</p>
    </div>
  );
}

// 메인 페이지 컴포넌트
export default function Home() {
  // 선수 데이터를 배열로 관리하여 확장성을 확보합니다.
  const [players, setPlayers] = useState([
    { id: 1, name: "강백호", votes: 0, imageUrl: "/강백호.png" },
    { id: 2, name: "안현민", votes: 0, imageUrl: "/안현민.png" },
    // 나중에 여기에 선수를 추가할 수 있습니다.
    // { id: 3, name: "새로운 선수", votes: 0, imageUrl: "https://placehold.co/128x128" },
  ]);

  // 투표 처리 함수
  const handleVote = (playerId: number) => {
    setPlayers(
      players.map((player) =>
        player.id === playerId ? { ...player, votes: player.votes + 1 } : player
      )
    );
  };

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1 className="text-3xl font-bold text-center mb-2">당신은 어느쪽?</h1>

      {/* 선수 목록을 동적으로 렌더링합니다. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {players.map((player) => (
          <PlayerCard
            key={player.id}
            name={player.name}
            imageUrl={player.imageUrl}
            votes={player.votes}
            onVote={() => handleVote(player.id)}
          />
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-lg mb-4">당신의 투표를 만들어 보세요</p>
        <Link href="/create-poll" className="bg-green-500 text-white px-6 py-3 rounded-full text-lg hover:bg-green-600">
          투표 생성
        </Link>
      </div>
    </main>
  );
}
