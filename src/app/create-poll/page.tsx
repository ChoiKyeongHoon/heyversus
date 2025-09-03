export default function CreatePollPage() {
  return (
    <main className="container mx-auto p-4 pt-16">
      <h1 className="text-3xl font-bold text-center mb-8">새로운 투표 생성</h1>
      <div className="w-full max-w-lg mx-auto">
        <form className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="poll-title">
              투표 제목
            </label>
            <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="poll-title" type="text" placeholder="예: 최고의 프로그래밍 언어는?" />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="option1">
              항목 1
            </label>
            <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="option1" type="text" placeholder="예: JavaScript" />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="option2">
              항목 2
            </label>
            <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline" id="option2" type="text" placeholder="예: Python" />
          </div>
          <div className="flex items-center justify-center">
            <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" type="button">
              투표 생성하기
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
