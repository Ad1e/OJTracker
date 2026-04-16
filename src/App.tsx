import { useHoursCalc } from "./hooks/useHoursCalc";
import { StatsCard } from "./components/StatsCard";
import logs from "./data/journalData.json";

export default function App() {
  const stats = useHoursCalc(logs);
  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <StatsCard stats={stats} target={500} />
    </main>
  );
}