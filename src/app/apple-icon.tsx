import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

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
            points="90,50 70,84.6 30,84.6 10,50 30,15.4 70,15.4"
            fill="#f5c518"
          />
          <polygon
            points="72,50 61,69 39,69 28,50 39,31 61,31"
            fill="#111111"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
