// Декор: нотная волна с точками (как в песеннике)
export default function WaveLine({ className = "" }) {
  return (
    <svg
      viewBox="0 0 360 28"
      fill="none"
      className={"w-full " + className}
      aria-hidden="true"
    >
      <path
        d="M0 16 C 40 4, 80 24, 120 14 S 200 6, 240 16 S 320 26, 360 12"
        stroke="var(--wine)"
        strokeOpacity="0.55"
        strokeWidth="1.4"
      />
      <path
        d="M0 22 C 50 12, 100 26, 150 18 S 250 8, 300 18 S 340 22, 360 18"
        stroke="var(--gold)"
        strokeOpacity="0.5"
        strokeWidth="1.2"
      />
      <circle cx="120" cy="14" r="2.6" fill="var(--wine)" />
      <circle cx="240" cy="16" r="2.6" fill="var(--gold)" />
      <circle cx="330" cy="15" r="2.2" fill="var(--wine)" fillOpacity="0.6" />
    </svg>
  );
}

// Римские цифры для номеров песен
export function roman(n) {
  const map = [
    [50, "l"], [40, "xl"], [10, "x"], [9, "ix"],
    [5, "v"], [4, "iv"], [1, "i"],
  ];
  let r = "";
  for (const [v, s] of map) {
    while (n >= v) { r += s; n -= v; }
  }
  return r;
}
