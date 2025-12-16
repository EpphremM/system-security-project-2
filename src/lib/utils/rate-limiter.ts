import { RateLimiterMemory } from "rate-limiter-flexible";


export const rateLimiter = new RateLimiterMemory({
  points: 100, 
  duration: 60, 
});


export const authRateLimiter = new RateLimiterMemory({
  points: 5, 
  duration: 60, 
  blockDuration: 300, 
});


