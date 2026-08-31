import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Solid amber honeycomb cell on a dark tile.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <svg
          width="180"
          height="180"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" fill="#111111" />
          <polygon
            points="50,8 86,29 86,71 50,92 14,71 14,29"
            fill="#f5c518"
          />
          <polygon
            points="50,34 64,42 64,58 50,66 36,58 36,42"
            fill="#111111"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
