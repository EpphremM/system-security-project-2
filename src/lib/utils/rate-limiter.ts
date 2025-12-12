import { RateLimiterMemory } from "rate-limiter-flexible";

// Rate limiter for API routes
export const rateLimiter = new RateLimiterMemory({
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
});

// Stricter rate limiter for authentication endpoints
export const authRateLimiter = new RateLimiterMemory({
  points: 5, // Number of requests
  duration: 60, // Per 60 seconds
  blockDuration: 300, // Block for 5 minutes if limit exceeded
});


