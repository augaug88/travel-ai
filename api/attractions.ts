import { searchAttractions } from "../lib/attractions.js";
import { createHandler, requireQuery } from "../lib/http.js";

export default createHandler("GET", (req) => searchAttractions({ city: requireQuery(req, "city") }));
