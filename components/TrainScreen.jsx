"use client";

// Экран тренировки: выбирает нужный режим и сохраняет результат
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import ClozeTrainer from "@/components/ClozeTrainer";
import LettersTrainer from "@/components/LettersTrainer";
import RelayTrainer from "@/components/RelayTrainer";
import ResultView from "@/components/ResultView";
import { getSong, saveResult } from "@/lib/storage";
import { track } from "@/lib/track";
import { CLOZE_LEVELS } from "@/lib/lyrics";

const MODE_NAMES = {
  cloze: "Пропуски слов",
  letters: "Первые буквы",
  relay: "Эстафета строк",
};

export default function TrainScreen({ id, mode, level }) {
  const [song, setSong] = useState(null);
  const [score, setScore] = useState(null);
  const [round, setRound] = useState(0); // для «Ещё раз»
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getSong(id)
      .then((s) => {
        setSong(s);
        if (!s) setFailed(true);
        else track("train_start", { mode, level });
      })
      .catch(() => setFailed(true));
  }, [id]);

  async function finish(s) {
    setScore(s);
    track("train_finish", { mode, level, score: s });
    try {
      await saveResult(id, mode, level, s);
    } catch {}
  }

  if (song === null) {
    return (
      <main>
        <Header title="Тренировка" />
        {failed ? (
          <div className="glass rounded-xl3 p-8 text-center">
            <p className="mb-2 font-serif text-lg font-bold">
              Песня не загрузилась
            </p>
            <p className="text-sm text-sub">Нет связи или песня была убрана</p>
          </div>
        ) : (
          <div className="glass animate-pulse rounded-xl3 p-10 text-center text-sub">
            Загрузка…
          </div>
        )}
      </main>
    );
  }

  if (score !== null) {
    return (
      <main>
        <ResultView
          score={score}
          songId={id}
          onRetry={() => {
            setScore(null);
            setRound((r) => r + 1);
          }}
        />
      </main>
    );
  }

  const levelName =
    mode === "cloze"
      ? " · " + (CLOZE_LEVELS.find((l) => l.level === level)?.name || "")
      : "";

  return (
    <main>
      <Header title={MODE_NAMES[mode] + levelName} />
      {mode === "cloze" && (
        <ClozeTrainer
          key={round}
          songId={id}
          lyrics={song.lyrics}
          level={level}
          onFinish={finish}
        />
      )}
      {mode === "letters" && (
        <LettersTrainer key={round} lyrics={song.lyrics} onFinish={finish} />
      )}
      {mode === "relay" && (
        <RelayTrainer key={round} lyrics={song.lyrics} onFinish={finish} />
      )}
    </main>
  );
}
