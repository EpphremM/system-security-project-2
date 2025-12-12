import { z } from "zod";
import validator from "validator";

/**
 * Sanitize string input to prevent SQL injection
 */
export function sanitizeSQLInput(input: string): string {
  // Remove SQL injection patterns
  return input
    .replace(/(['";])/g, "")
    .replace(/--/g, "")
    .replace(/\/\*/g, "")
    .replace(/\*\//g, "")
    .replace(/;/g, "")
    .trim();
}

/**
 * Validate and sanitize string input
 */
export function validateStringInput(
  input: string,
  options?: {
    maxLength?: number;
    minLength?: number;
    pattern?: RegExp;
    allowSpecialChars?: boolean;
  }
): {
  valid: boolean;
  sanitized?: string;
  error?: string;
} {
  // Basic sanitization
  let sanitized = input.trim();

  // SQL injection prevention
  sanitized = sanitizeSQLInput(sanitized);

  // Length validation
  if (options?.minLength && sanitized.length < options.minLength) {
    return {
      valid: false,
      error: `Input must be at least ${options.minLength} characters`,
    };
  }

  if (options?.maxLength && sanitized.length > options.maxLength) {
    return {
      valid: false,
      error: `Input must be at most ${options.maxLength} characters`,
    };
  }

  // Pattern validation
  if (options?.pattern && !options.pattern.test(sanitized)) {
    return {
      valid: false,
      error: "Input does not match required pattern",
    };
  }

  return {
    valid: true,
    sanitized,
  };
}

/**
 * Prevent XSS attacks by encoding HTML entities
 */
export function encodeHTML(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: {
    name: string;
    size: number;
    type: string;
    content?: Buffer;
  },
  options?: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    allowedExtensions?: string[];
    scanForMalware?: boolean;
  }
): {
  valid: boolean;
  error?: string;
} {
  // Size validation
  if (options?.maxSize && file.size > options.maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${options.maxSize} bytes`,
    };
  }

  // Type validation
  if (options?.allowedTypes && !options.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }

  // Extension validation
  if (options?.allowedExtensions) {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !options.allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `File extension .${extension} is not allowed`,
      };
    }
  }

  // Basic malware scanning (check for suspicious patterns)
  if (options?.scanForMalware && file.content) {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /onerror=/i,
      /onload=/i,
      /eval\(/i,
      /exec\(/i,
    ];

    const content = file.content.toString("utf8", 0, Math.min(1024, file.content.length));
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        return {
          valid: false,
          error: "File contains suspicious content",
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Validate email input
 */
export function validateEmail(email: string): {
  valid: boolean;
  sanitized?: string;
  error?: string;
} {
  const sanitized = email.trim().toLowerCase();
  
  if (!validator.isEmail(sanitized)) {
    return {
      valid: false,
      error: "Invalid email format",
    };
  }

  // Additional checks
  if (sanitized.length > 254) {
    return {
      valid: false,
      error: "Email address too long",
    };
  }

  return {
    valid: true,
    sanitized,
  };
}

/**
 * Validate URL input
 */
export function validateURL(url: string): {
  valid: boolean;
  sanitized?: string;
  error?: string;
} {
  const sanitized = url.trim();

  if (!validator.isURL(sanitized, { require_protocol: true })) {
    return {
      valid: false,
      error: "Invalid URL format",
    };
  }

  // Only allow HTTP/HTTPS
  if (!sanitized.startsWith("http://") && !sanitized.startsWith("https://")) {
    return {
      valid: false,
      error: "URL must use HTTP or HTTPS protocol",
    };
  }

  return {
    valid: true,
    sanitized,
  };
}

/**
 * Validate numeric input
 */
export function validateNumber(
  input: string | number,
  options?: {
    min?: number;
    max?: number;
    integer?: boolean;
  }
): {
  valid: boolean;
  value?: number;
  error?: string;
} {
  const num = typeof input === "string" ? parseFloat(input) : input;

  if (isNaN(num)) {
    return {
      valid: false,
      error: "Invalid number",
    };
  }

  if (options?.integer && !Number.isInteger(num)) {
    return {
      valid: false,
      error: "Number must be an integer",
    };
  }

  if (options?.min !== undefined && num < options.min) {
    return {
      valid: false,
      error: `Number must be at least ${options.min}`,
    };
  }

  if (options?.max !== undefined && num > options.max) {
    return {
      valid: false,
      error: `Number must be at most ${options.max}`,
    };
  }

  return {
    valid: true,
    value: num,
  };
}

/**
 * Validate JSON input
 */
export function validateJSON(input: string): {
  valid: boolean;
  parsed?: any;
  error?: string;
} {
  try {
    const parsed = JSON.parse(input);
    return {
      valid: true,
      parsed,
    };
  } catch (error) {
    return {
      valid: false,
      error: "Invalid JSON format",
    };
  }
}



