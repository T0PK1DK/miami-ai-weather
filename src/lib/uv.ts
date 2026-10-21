/** WHO / WMO ultraviolet index categories. */
export function uvCategory(uv: number): {
  level: "low" | "moderate" | "high" | "very-high" | "extreme";
  label: string;
  advice: string;
} {
  if (uv >= 11) {
    return { level: "extreme", label: "Extreme", advice: "Avoid midday sun. Shade, SPF, hat, and sleeves." };
  }
  if (uv >= 8) {
    return { level: "very-high", label: "Very high", advice: "Extra protection. Limit time in the open 10 a.m.–4 p.m." };
  }
  if (uv >= 6) {
    return { level: "high", label: "High", advice: "Sunscreen and a hat. Seek shade at midday." };
  }
  if (uv >= 3) {
    return { level: "moderate", label: "Moderate", advice: "Sunscreen if you will be out for more than a short walk." };
  }
  return { level: "low", label: "Low", advice: "Low burn risk. Sunglasses still help on the water." };
}
