"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  isPublic: boolean; // isPublic 속성 추가
}

interface User {
  id: string;
  name: string;
}

export default function PollPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loginRequired, setLoginRequired] = useState(false);

  useEffect(() => {
    // 1. Fetch user data from localStorage
    const storedUser = localStorage.getItem("user");
    const currentUser = storedUser ? JSON.parse(storedUser) : null;
    setUser(currentUser);

    // 2. Fetch poll data
    const storedPolls = JSON.parse(localStorage.getItem("polls") || "[]");
    const foundPoll: Poll | undefined = storedPolls.find(
      (p: Poll) => p.id === params.id
    );

    if (!foundPoll) {
      setPoll(null);
      return;
    }
    setPoll(foundPoll);

    // 3. Check voting status based on poll type
    if (foundPoll.isPublic) {
      // For public polls, check anonymous voter list
      const votedPolls = JSON.parse(localStorage.getItem("votedPolls") || "[]");
      if (votedPolls.includes(params.id)) {
        setHasVoted(true);
      }
    } else {
      // For private polls, check login status and user-specific votes
      if (!currentUser) {
        setLoginRequired(true);
      } else {
        const privateVotes = JSON.parse(
          localStorage.getItem("privateVotes") || "{}"
        );
        if (privateVotes[params.id]?.includes(currentUser.id)) {
          setHasVoted(true);
        }
      }
    }
  }, [params.id]);

  const handleVote = (optionId: string) => {
    if (!poll || hasVoted || loginRequired) return;

    setPoll((prevPoll) => {
      if (!prevPoll) return null;

      const updatedPoll = {
        ...prevPoll,
        options: prevPoll.options.map((option) =>
          option.id === optionId
            ? { ...option, votes: option.votes + 1 }
            : option
        ),
      };

      // Update poll data in localStorage
      const storedPolls = JSON.parse(localStorage.getItem("polls") || "[]");
      const updatedPolls = storedPolls.map((p: Poll) =>
        p.id === updatedPoll.id ? updatedPoll : p
      );
      localStorage.setItem("polls", JSON.stringify(updatedPolls));

      // Mark this poll as voted based on poll type
      if (poll.isPublic) {
        const votedPolls = JSON.parse(
          localStorage.getItem("votedPolls") || "[]"
        );
        localStorage.setItem(
          "votedPolls",
          JSON.stringify([...votedPolls, params.id])
        );
      } else if (user) {
        const privateVotes = JSON.parse(
          localStorage.getItem("privateVotes") || "{}"
        );
        const pollVoters = privateVotes[params.id] || [];
        privateVotes[params.id] = [...pollVoters, user.id];
        localStorage.setItem("privateVotes", JSON.stringify(privateVotes));
      }

      setHasVoted(true);
      return updatedPoll;
    });
  };

  if (!poll) {
    return (
      <main className="container mx-auto p-4 pt-16">
        <h1 className="text-3xl font-bold text-center mb-8 text-white">
          투표를 찾을 수 없습니다.
        </h1>
      </main>
    );
  }

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1 className="text-3xl font-bold text-center mb-8 text-white">
        {poll.question}
      </h1>
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 max-w-md mx-auto">
        {!poll.isPublic && (
           <div className="text-center mb-4 bg-red-500/20 text-yellow-300 py-2 px-4 rounded-md border border-yellow-400">
             <p>이 투표는 비공개 투표입니다.</p>
           </div>
        )}
        <div className="space-y-4">
          {poll.options.map((option) => (
            <div
              key={option.id}
              className="flex items-center justify-between bg-gray-700 p-4 rounded-md"
            >
              <span className="text-white text-lg">{option.text}</span>
              <div className="flex items-center space-x-3">
                <span className="text-blue-300 text-lg">{option.votes} 표</span>
                <button
                  onClick={() => handleVote(option.id)}
                  className={`font-bold py-2 px-4 rounded-lg ${
                    hasVoted || loginRequired
                      ? "bg-gray-500 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  } text-white`}
                  disabled={hasVoted || loginRequired}
                >
                  {hasVoted ? "투표 완료" : "투표"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {loginRequired && (
          <div className="text-center text-red-400 mt-4">
            <p>로그인이 필요한 비공개 투표입니다.</p>
            <button onClick={() => router.push('/signin')} className="text-blue-400 hover:underline mt-2">
              로그인 페이지로 이동
            </button>
          </div>
        )}

        {hasVoted && !loginRequired && (
          <p className="text-center text-yellow-400 mt-4">
            이 투표에 이미 참여하셨습니다.
          </p>
        )}

        {/* KakaoTalk Share Button */}
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => {
              alert("카카오톡 공유 기능은 Kakao SDK 연동이 필요합니다.");
            }}
            className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-bold py-3 px-6 rounded-lg shadow-md"
          >
            카카오톡 공유
          </button>
          <button
            type="button"
            onClick={() => {
              const pollUrl = window.location.href;
              navigator.clipboard
                .writeText(pollUrl)
                .then(() => {
                  alert("투표 링크가 클립보드에 복사되었습니다!");
                })
                .catch((err) => {
                  console.error("링크 복사 실패:", err);
                  alert("링크 복사에 실패했습니다.");
                });
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-md ml-4"
          >
            링크 공유
          </button>
        </div>
      </div>
    </main>
  );
}