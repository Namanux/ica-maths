import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111111",
          color: "#f2f2f2",
          fontSize: 118,
          fontWeight: 700,
          fontFamily: "Georgia, serif",
        }}
      >
        π
      </div>
    ),
    { ...size }
  );
}
