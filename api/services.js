// api/services.js

const API_URL = "https://justanotherpanel.com/api/v2";
const API_KEY = process.env.JAP_API_KEY;

// simple in-memory cache (works per Vercel instance)
let cache = {
  time: 0,
  data: null
};

export default async function handler(req, res) {
  const start = Date.now();

  const platform = (req.query.platform || "").toLowerCase();
  const type = (req.query.type || "").toLowerCase();
  const limit = parseInt(req.query.limit || "10", 10);

  if (!platform || !type) {
    return res.status(400).json({
      error: "Missing parameters",
      usage: "?platform=facebook&type=followers&limit=10"
    });
  }

  let services;

  // 🔥 cache for 60 seconds
  if (cache.data && Date.now() - cache.time < 60_000) {
    services = cache.data;
  } else {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        key: API_KEY,
        action: "services"
      })
    });

    services = await response.json();

    cache = {
      time: Date.now(),
      data: services
    };
  }

  const result = [];

  for (const service of services) {
    const haystack = (
      (service.category || "") +
      " " +
      (service.name || "")
    ).toLowerCase();

    if (
      haystack.includes(platform) &&
      haystack.includes(type)
    ) {
      result.push({
        service_id: service.service,
        name: service.name,
        rate: service.rate,
        min: service.min,
        max: service.max,
        refill: !!service.refill,
        cancel: !!service.cancel
      });

      if (result.length >= limit) break;
    }
  }

  const timeMs = Date.now() - start;

  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate");
  return res.status(200).json({
    platform,
    type,
    limit,
    count: result.length,
    response_time_ms: timeMs,
    data: result
  });
}
