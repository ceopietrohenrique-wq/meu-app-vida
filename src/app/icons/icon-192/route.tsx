import { ImageResponse } from "next/og";

export function GET() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        color: "#fafafa",
        fontSize: 96,
        fontWeight: 700,
        fontFamily: "sans-serif",
      }}
    >
      V
    </div>,
    { width: 192, height: 192 },
  );
}
