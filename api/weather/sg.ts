import { createHandler, query } from "../../lib/http.js";
import { sgWeather } from "../../lib/weather.js";

export default createHandler("GET", (req) => sgWeather({ area: query(req, "area") }));
