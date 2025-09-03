type PollPageProps = {
  params: {
    id: string;
  };
};

export default function PollPage({ params }: PollPageProps) {
  return (
    <main className="container mx-auto p-4 pt-16">
      <h1 className="text-3xl font-bold text-center mb-8">투표 결과</h1>
      <div className="text-center">
        <p className="text-lg">투표 ID: {params.id}</p>
        <p className="mt-4"><em>(여기에 투표 내용과 결과가 표시됩니다.)</em></p>
      </div>
    </main>
  );
}
