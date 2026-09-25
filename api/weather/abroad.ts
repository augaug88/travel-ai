import { createHandler, requireQuery } from "../../lib/http.js";
import { abroadWeather } from "../../lib/weather.js";

export default createHandler("GET", (req) => abroadWeather({ city: requireQuery(req, "city") }));
