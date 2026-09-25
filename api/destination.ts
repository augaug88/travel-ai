import { destinationInfo } from "../lib/destination.js";
import { createHandler, requireQuery } from "../lib/http.js";

export default createHandler("GET", (req) => destinationInfo({ city: requireQuery(req, "city") }));
