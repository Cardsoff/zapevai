import TrainScreen from "@/components/TrainScreen";

export default function TrainPage({ params, searchParams }) {
  return (
    <TrainScreen
      id={params.id}
      mode={searchParams?.mode || "cloze"}
      level={Number(searchParams?.level || 1)}
    />
  );
}
