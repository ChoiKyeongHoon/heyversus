"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatePollPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState(["", ""]); // Start with 2 options
  const [isPublic, setIsPublic] = useState(false); // Default to private

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      // Always keep at least 2 options
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const handleCreatePoll = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically send the data to a server
    // and get a real poll ID back.
    const newPollId = Math.random().toString(36).substring(2, 9);
    const newPoll = {
      id: newPollId,
      question: title,
      options: options.map((optionText) => ({
        id: Math.random().toString(36).substring(2, 9),
        text: optionText,
        votes: 0,
      })),
      isPublic: isPublic,
    };

    // Save to localStorage
    const existingPolls = JSON.parse(localStorage.getItem("polls") || "[]");
    localStorage.setItem("polls", JSON.stringify([...existingPolls, newPoll]));

    console.log("Creating poll:", newPoll);
    router.push(`/poll/${newPollId}`);
  };

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1 className="text-4xl font-bold text-center mb-8 text-yellow-400">
        Let&apos;s Poll
      </h1>
      <div className="w-full max-w-lg mx-auto relative">
        {/* Toggle Button */}
        <button
          type="button"
          onClick={() => setIsPublic(!isPublic)}
          className="absolute -top-10 left-0 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {isPublic ? "공개 투표" : "비공개 투표"}
        </button>

        <form
          onSubmit={handleCreatePoll}
          className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4"
        >
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="poll-title"
            >
              투표 제목
            </label>
            <input
              id="poll-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 수원 kt 위즈 최고의 타자는?"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          {options.map((option, index) => (
            <div key={index} className="mb-4">
              <label
                className="block text-gray-700 text-sm font-bold mb-2"
                htmlFor={`option${index}`}
              >
                항목 {index + 1}
              </label>
              <div className="flex items-center">
                <input
                  id={`option${index}`}
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`항목 ${index + 1} 내용`}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="ml-2 text-red-500 hover:text-red-700 font-bold p-2"
                  >
                    X
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between mt-6">
            <div>
              {options.length < 6 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="bg-gray-200 text-gray-800 p-2 rounded-full hover:bg-gray-300 flex items-center justify-center w-10 h-10"
                >
                  <span className="text-xl font-bold">+</span>
                </button>
              )}
            </div>
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              투표 생성하기
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
