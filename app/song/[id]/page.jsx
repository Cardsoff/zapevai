import SongScreen from "@/components/SongScreen";

export default function SongPage({ params }) {
  return <SongScreen id={params.id} />;
}
