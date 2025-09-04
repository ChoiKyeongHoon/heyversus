'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// PlayerCard 컴포넌트: disabled 상태를 받아 버튼을 비활성화합니다.
function PlayerCard({
  name,
  imageUrl,
  onVote,
  votes,
  disabled,
}: {
  name: string;
  imageUrl: string;
  onVote: () => void;
  votes: number;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <img
        src={imageUrl}
        alt={name}
        className="w-32 h-32 bg-gray-200 rounded-full mb-4 object-cover"
      />
      <h3 className="text-xl font-bold mb-2 text-white drop-shadow-lg">{name}</h3>
      <button
        onClick={onVote}
        className={`text-white px-4 py-2 rounded ${
          disabled
            ? 'bg-gray-500 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
        disabled={disabled}
      >
        {disabled ? '투표 완료' : '투표하기'}
      </button>
      <p className="mt-2 text-white drop-shadow-lg">득표: {votes}</p>
    </div>
  );
}

// 메인 페이지 컴포넌트
export default function Home() {
  const HOME_POLL_ID = 'home-page-poll-01'; // 홈 페이지 투표의 고유 ID
  const [players, setPlayers] = useState([
    { id: 1, name: '강백호', votes: 0, imageUrl: '/강백호.png' },
    { id: 2, name: '안현민', votes: 0, imageUrl: '/안현민.png' },
  ]);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    // 1. 투표 결과를 로컬 스토리지에서 불러오기
    const storedPlayers = localStorage.getItem(HOME_POLL_ID);
    if (storedPlayers) {
      setPlayers(JSON.parse(storedPlayers));
    }

    // 2. 중복 투표 여부 확인
    const votedPolls = JSON.parse(localStorage.getItem('votedPolls') || '[]');
    if (votedPolls.includes(HOME_POLL_ID)) {
      setHasVoted(true);
    }
  }, []);

  // 투표 처리 함수
  const handleVote = (playerId: number) => {
    if (hasVoted) return; // 이미 투표했다면 아무것도 하지 않음

    const updatedPlayers = players.map((player) =>
      player.id === playerId ? { ...player, votes: player.votes + 1 } : player
    );

    setPlayers(updatedPlayers);

    // 1. 변경된 투표 결과를 로컬 스토리지에 저장
    localStorage.setItem(HOME_POLL_ID, JSON.stringify(updatedPlayers));

    // 2. 이 투표에 참여했음을 로컬 스토리지에 기록
    const votedPolls = JSON.parse(localStorage.getItem('votedPolls') || '[]');
    localStorage.setItem(
      'votedPolls',
      JSON.stringify([...votedPolls, HOME_POLL_ID])
    );

    setHasVoted(true);
  };

  return (
    <main
      className="container mx-auto p-4 flex flex-col"
      style={{ minHeight: 'calc(100vh - 80px)' }}
    >
      <h1 className="text-3xl font-bold text-center my-4 text-red-500 drop-shadow-lg">
        Hey! Vote Here!!
      </h1>

      {hasVoted && (
        <p className="text-center text-yellow-400 mb-4">
          이 투표에 참여해주셔서 감사합니다!
        </p>
      )}

      {/* 선수 목록을 동적으로 렌더링합니다. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-grow items-center">
        {players.map((player) => (
          <PlayerCard
            key={player.id}
            name={player.name}
            imageUrl={player.imageUrl}
            votes={player.votes}
            onVote={() => handleVote(player.id)}
            disabled={hasVoted}
          />
        ))}
      </div>

      <div className="text-center pb-8">
        <p className="text-lg mb-4 text-white drop-shadow-lg">
          당신만의 투표를 만들어 보세요
        </p>
        <Link
          href="/create-poll"
          className="bg-green-500 text-white px-6 py-3 rounded-full text-lg hover:bg-green-600"
        >
          투표 생성
        </Link>
      </div>
    </main>
  );
}