"use client";

import Link from "next/link";
import { useEffect,useState } from "react";

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
}

// Mock data for polls
export default function PollListPage() {
  const [polls, setPolls] = useState<Poll[]>([]);

  useEffect(() => {
    const storedPolls = JSON.parse(localStorage.getItem("polls") || "[]");
    setPolls(storedPolls);
  }, []);

  const handleVote = (pollId: string, optionId: string) => {
    setPolls((prevPolls) => {
      const updatedPolls = prevPolls.map((poll) =>
        poll.id === pollId
          ? {
              ...poll,
              options: poll.options.map((option) =>
                option.id === optionId
                  ? { ...option, votes: option.votes + 1 }
                  : option
              ),
            }
          : poll
      );
      localStorage.setItem("polls", JSON.stringify(updatedPolls));
      return updatedPolls;
    });
  };

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1 className="text-3xl font-bold text-center mb-8 text-white">
        투표 목록
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {polls.map((poll) => (
          <div key={poll.id} className="bg-gray-800 rounded-lg shadow-lg p-6">
            <Link href={`/poll/${poll.id}`} passHref>
              <h2 className="text-xl font-semibold text-white mb-4 cursor-pointer hover:text-blue-400">
                {poll.question}
              </h2>
            </Link>
            <div className="space-y-3">
              {poll.options.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center justify-between bg-gray-700 p-3 rounded-md"
                >
                  <span className="text-white">{option.text}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-300">{option.votes} 표</span>
                    <button
                      onClick={() => handleVote(poll.id, option.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 px-3 rounded-md"
                    >
                      투표
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
