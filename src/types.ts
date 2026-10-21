export type Units = "us" | "metric";

export type ViewId =
  | "now"
  | "hourly"
  | "daily"
  | "radar"
  | "beach"
  | "heat"
  | "flood"
  | "tropics"
  | "play";

export type CoastKind = "atlantic" | "bay" | "inland";

export type FloodSensitivity = "high" | "moderate" | "low";

export type Neighborhood = {
  id: string;
  name: string;
  area: string;
  lat: number;
  lon: number;
  coast: CoastKind;
  flood: FloodSensitivity;
  tags: string[];
};

export type HourPoint = {
  time: Date;
  tempF: number;
  feelsF: number;
  humidity: number;
  precipIn: number;
  pop: number;
  weatherCode: number;
  windMph: number;
  gustMph: number;
  windDir: number;
  uv: number;
  cape: number;
  visibilityMi: number;
  cloud: number;
};

export type DayPoint = {
  date: Date;
  highF: number;
  lowF: number;
  feelsMaxF: number;
  precipIn: number;
  pop: number;
  weatherCode: number;
  uvMax: number;
  windMaxMph: number;
  sunrise: Date;
  sunset: Date;
};

export type AlertItem = {
  id: string;
  event: string;
  severity: string;
  urgency: string;
  headline: string;
  instruction: string;
  ends: Date | null;
};

export type TideEvent = {
  time: Date;
  heightFt: number;
  type: "H" | "L";
};

export type StormItem = {
  id: string;
  name: string;
  classification: string;
  basin: string;
};

export type RadarFrame = {
  time: Date;
  path: string;
};

export type Snapshot = {
  fetchedAt: Date;
  place: Neighborhood;
  timezone: string;
  current: {
    time: Date;
    tempF: number;
    feelsF: number;
    humidity: number;
    precipIn: number;
    weatherCode: number;
    windMph: number;
    gustMph: number;
    windDir: number;
    pressureMb: number;
    cloud: number;
    isDay: boolean;
    visibilityMi: number;
  };
  hours: HourPoint[];
  days: DayPoint[];
  nowcast: Array<{ time: Date; precipIn: number }>;
  alerts: AlertItem[];
  tides: TideEvent[];
  storms: StormItem[];
  aqi: number | null;
  waveFt: number | null;
  radar: {
    host: string;
    frames: RadarFrame[];
  };
  sources: {
    forecast: boolean;
    air: boolean;
    marine: boolean;
    alerts: boolean;
    tides: boolean;
    storms: boolean;
    radar: boolean;
  };
};

export type RiskLevel = "low" | "moderate" | "high" | "severe";

export type ActivityId = "beach" | "run" | "commute" | "patio" | "boat" | "kids";

export type ActivityScore = {
  id: ActivityId;
  label: string;
  score: number;
  level: RiskLevel;
  reasons: string[];
  bestWindow: { start: Date; end: Date; reason: string } | null;
};

export type Briefing = {
  greeting: string;
  headline: string;
  summary: string;
  sections: Array<{ title: string; body: string }>;
  actions: string[];
  windows: Array<{ label: string; start: Date; end: Date; reason: string }>;
  firedRules: string[];
};

export type FloodAssessment = {
  level: RiskLevel;
  score: number;
  reasons: string[];
  nextHigh: TideEvent | null;
  kingTide: boolean;
};
