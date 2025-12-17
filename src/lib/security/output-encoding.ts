
export function encodeHTML(input: string): string {
  const entityMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };

  return input.replace(/[&<>"'/]/g, (char) => entityMap[char] || char);
}

export function encodeHTMLAttribute(input: string): string {
  return encodeHTML(input).replace(/`/g, "&#96;");
}

export function encodeJavaScript(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function encodeURL(input: string): string {
  return encodeURIComponent(input);
}

export function secureJSONSerialize(data: any, options?: {
  removeSensitive?: boolean;
  maxDepth?: number;
}): string {
  const sensitiveKeys = ["password", "token", "secret", "key", "apiKey", "authToken"];
  const maxDepth = options?.maxDepth || 10;

  function sanitize(obj: any, depth: number = 0): any {
    if (depth > maxDepth) {
      return "[Max Depth Reached]";
    }

    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => sanitize(item, depth + 1));
    }

    if (typeof obj === "object") {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (options?.removeSensitive && sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
          sanitized[key] = "[REDACTED]";
        } else {
          sanitized[key] = sanitize(value, depth + 1);
        }
      }
      return sanitized;
    }

    return obj;
  }

  return JSON.stringify(sanitize(data));
}

export function sanitizeErrorMessage(error: Error | unknown): string {
  if (error instanceof Error) {
    if (process.env.NODE_ENV === "production") {
      return "An error occurred. Please try again later.";
    }
    return error.message;
  }
  return "An unknown error occurred";
}

export function filterLogOutput(data: any): any {
  const sensitivePatterns = [
    /password/i,
    /token/i,
    /secret/i,
    /key/i,
    /apiKey/i,
    /authToken/i,
    /authorization/i,
    /cookie/i,
  ];

  function filter(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === "string") {
      for (const pattern of sensitivePatterns) {
        if (pattern.test(obj)) {
          return "[FILTERED]";
        }
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(filter);
    }

    if (typeof obj === "object") {
      const filtered: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const isSensitive = sensitivePatterns.some((pattern) => pattern.test(key));
        if (isSensitive) {
          filtered[key] = "[FILTERED]";
        } else {
          filtered[key] = filter(value);
        }
      }
      return filtered;
    }

    return obj;
  }

  return filter(data);
}



