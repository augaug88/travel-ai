import { searchFlights } from "../lib/flights.js";
import { createHandler, query, requireQuery } from "../lib/http.js";

export default createHandler("GET", (req) =>
  searchFlights({ from: query(req, "from") ?? "SIN", to: requireQuery(req, "to"), depart: requireQuery(req, "depart"), ret: query(req, "return") }),
);
