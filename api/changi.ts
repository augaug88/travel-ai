import { changiPlan } from "../lib/changi.js";
import { createHandler, query, requireQuery } from "../lib/http.js";

export default createHandler("GET", (req) => changiPlan({ from: query(req, "from"), flight_time: requireQuery(req, "flight_time") }));
