import { searchHotels } from "../lib/hotels.js";
import { createHandler, query, requireQuery } from "../lib/http.js";

export default createHandler("GET", (req) =>
  searchHotels({
    city: requireQuery(req, "city"),
    country: query(req, "country"),
    checkin: requireQuery(req, "checkin"),
    checkout: requireQuery(req, "checkout"),
  }),
);
