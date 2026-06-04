import Header from "@/components/Header";
import Link from "next/link";

export const metadata = { title: "Условия использования — Запевай" };

export default function TermsPage() {
  return (
    <main className="pb-safe">
      <Header title="Условия использования" />

      <div className="glass space-y-4 rounded-xl3 p-5 text-[15px] leading-relaxed">
        <p className="font-serif text-sm italic text-sub">
          Обновлено: 4 июня 2026
        </p>

        <section>
          <h2 className="mb-1 font-serif text-lg font-bold">1. Что такое «Запевай»</h2>
          <p>
            «Запевай» — технический инструмент для личных тренировок памяти:
            сервис помогает заучивать тексты, которые пользователь добавляет
            самостоятельно. Сервис не является библиотекой или каталогом
            текстов песен и не распространяет их.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-serif text-lg font-bold">2. Пользовательский контент</h2>
          <p>
            Все тексты в сервис загружают сами пользователи. Добавляя текст,
            пользователь подтверждает, что использует его в личных
            некоммерческих целях обучения и имеет на это право. Ответственность
            за загружаемый контент несёт загрузивший его пользователь.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-serif text-lg font-bold">3. Права на тексты</h2>
          <p>
            Права на тексты песен принадлежат их авторам и правообладателям.
            Сервис уважает авторские права: если вы правообладатель и считаете,
            что какой-то материал размещён неправомерно, напишите нам — мы
            оперативно удалим его (процедура notice-and-takedown).
          </p>
          <p className="mt-1">
            Контакт: <b>human.artem26@gmail.com</b> или кнопка «Замечание к
            песне» на странице песни.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-serif text-lg font-bold">4. Аккаунт и данные</h2>
          <p>
            Для сохранения прогресса нужен аккаунт (почта или Google). Мы
            храним только почту, прогресс тренировок и добавленные песни и не
            передаём данные третьим лицам. Удаление аккаунта — по запросу на
            почту выше.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-serif text-lg font-bold">5. Прочее</h2>
          <p>
            Сервис предоставляется «как есть», находится в стадии тестирования
            и может меняться. Используя «Запевай», вы соглашаетесь с этими
            условиями.
          </p>
        </section>
      </div>

      <Link
        href="/"
        className="mt-4 block text-center font-serif text-sm italic text-sub underline"
      >
        ← на главную
      </Link>
    </main>
  );
}
