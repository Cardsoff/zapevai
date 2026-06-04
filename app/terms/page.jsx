import Header from "@/components/Header";
import Link from "next/link";

export const metadata = {
  title: "Условия использования",
  description:
    "Правила использования тренажёра «Запевай»: авторские права, хранение данных и пользовательский контент.",
  alternates: { canonical: "https://zapevai.vercel.app/terms" },
};

export default function TermsPage() {
  return (
    <main className="pb-safe">
      <Header title="Условия использования" />

      <div className="glass rounded-xl3 p-5 font-serif text-[15px] leading-relaxed">
        <p className="kicker mb-3 !text-[10px]">Кратко и по-человечески</p>

        <h2 className="mb-1 text-lg font-bold">1. Что такое «Запевай»</h2>
        <p className="mb-4 text-sub">
          «Запевай» — технический инструмент для личных тренировок памяти:
          сервис помогает заучивать тексты, которые пользователи добавляют
          самостоятельно. Мы не продаём и не распространяем тексты песен.
        </p>

        <h2 className="mb-1 text-lg font-bold">2. Контент добавляют пользователи</h2>
        <p className="mb-4 text-sub">
          Все тексты в сервисе загружены пользователями. Добавляя текст, ты
          подтверждаешь, что используешь его для личного обучения и имеешь на
          это право. Ответственность за загружаемый контент несёт загрузивший
          его пользователь.
        </p>

        <h2 className="mb-1 text-lg font-bold">3. Права авторов</h2>
        <p className="mb-4 text-sub">
          Права на тексты песен принадлежат их авторам и правообладателям.
          Если ты правообладатель и считаешь, что какой-то текст размещён
          неправомерно, напиши нам через кнопку «Замечание к песне» или на
          почту human.artem26@gmail.com — мы оперативно удалим материал.
        </p>

        <h2 className="mb-1 text-lg font-bold">4. Аккаунт и данные</h2>
        <p className="mb-4 text-sub">
          Мы храним только почту и твой прогресс тренировок. Удалить аккаунт и
          данные можно по запросу на ту же почту. Пароли хранятся в
          зашифрованном виде, данные защищены на уровне базы.
        </p>

        <h2 className="mb-1 text-lg font-bold">5. Без гарантий</h2>
        <p className="mb-0 text-sub">
          Сервис предоставляется «как есть»: мы стараемся, чтобы всё работало,
          но не гарантируем бесперебойность и можем менять функциональность.
          Используя «Запевай», ты соглашаешься с этими условиями.
        </p>
      </div>

      <Link
        href="/"
        className="mt-5 block text-center font-serif text-sm italic text-accent underline"
      >
        ← вернуться к песеннику
      </Link>
    </main>
  );
}
