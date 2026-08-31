import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Solid amber honeycomb cell on a dark tile — reads clearly at 16px.
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <svg
          width="32"
          height="32"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" fill="#111111" />
          <polygon
            points="50,6 88,28 88,72 50,94 12,72 12,28"
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
