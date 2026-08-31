import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

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
            points="92,50 71,86.4 29,86.4 8,50 29,13.6 71,13.6"
            fill="#f5c518"
          />
          <polygon
            points="73,50 61.5,69.9 38.5,69.9 27,50 38.5,30.1 61.5,30.1"
            fill="#111111"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
