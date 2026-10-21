import "leaflet/dist/leaflet.css";
import "./styles.css";
import { WeatherApp } from "./app";

const root = document.querySelector("#app");
if (!root) throw new Error("Missing #app");
new WeatherApp(root as HTMLElement).start();
