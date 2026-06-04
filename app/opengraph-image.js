import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Запевай — выучи любую песню наизусть";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f6f1e7",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 12, color: "#8a7d6a", marginBottom: 10 }}>
          ПЕСЕННИК
        </div>
        <div style={{ display: "flex", fontSize: 130, fontWeight: 700, color: "#2a2118" }}>
          Запе<span style={{ fontStyle: "italic", color: "#722f37" }}>вай</span>
        </div>
        <div style={{ fontSize: 34, fontStyle: "italic", color: "#8a7d6a", marginTop: 14 }}>
          — выучи любую песню наизусть
        </div>
        <div style={{ display: "flex", gap: 26, marginTop: 48, fontSize: 26, color: "#722f37" }}>
          <span>✦ Пропуски слов</span>
          <span>↻ Умные повторения</span>
          <span>♪ Общая база</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
