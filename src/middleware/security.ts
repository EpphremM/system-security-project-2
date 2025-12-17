import { NextRequest, NextResponse } from "next/server";
import { rateLimit, authenticateAPIKey, checkAPIVersion } from "@/lib/security/api-security";
import { validateStringInput, validateFileUpload } from "@/lib/security/input-validation";
import { encodeHTML, filterLogOutput } from "@/lib/security/output-encoding";


export async function securityMiddleware(
  request: NextRequest,
  options?: {
    requireAuth?: boolean;
    requireAPIKey?: boolean;
    rateLimitEndpoint?: string;
    minAPIVersion?: string;
    maxAPIVersion?: string;
    validateInput?: boolean;
    allowedFileTypes?: string[];
    maxFileSize?: number;
  }
): Promise<{
  allowed: boolean;
  response?: NextResponse;
  metadata?: any;
}> {
  const metadata: any = {};

  
  if (options?.rateLimitEndpoint) {
    const rateLimitResult = await rateLimit(request, options.rateLimitEndpoint);
    if (!rateLimitResult.allowed) {
      return {
        allowed: false,
        response: rateLimitResult.response,
      };
    }
  }

  
  if (options?.requireAPIKey) {
    const apiKeyResult = await authenticateAPIKey(request);
    if (!apiKeyResult.authenticated) {
      return {
        allowed: false,
        response: apiKeyResult.response,
      };
    }
    metadata.apiKeyId = apiKeyResult.keyId;
    metadata.permissions = apiKeyResult.permissions;
  }

  
  if (options?.minAPIVersion || options?.maxAPIVersion) {
    const versionResult = checkAPIVersion(
      request,
      options.minAPIVersion,
      options.maxAPIVersion
    );
    if (!versionResult.valid) {
      return {
        allowed: false,
        response: versionResult.response,
      };
    }
    metadata.apiVersion = versionResult.version;
  }

  
  if (options?.validateInput && (request.method === "POST" || request.method === "PUT")) {
    try {
      const body = await request.clone().json();
      const validationResult = validateRequestBody(body);
      if (!validationResult.valid) {
        return {
          allowed: false,
          response: NextResponse.json(
            {
              error: "Invalid input",
              details: validationResult.errors,
            },
            { status: 400 }
          ),
        };
      }
    } catch (error) {
      
    }
  }

  
  if (request.method === "POST" && request.headers.get("content-type")?.includes("multipart/form-data")) {
    
    
  }

  return {
    allowed: true,
    metadata,
  };
}


function validateRequestBody(body: any): {
  valid: boolean;
  errors?: string[];
} {
  const errors: string[] = [];

  function validateValue(value: any, path: string = ""): void {
    if (value === null || value === undefined) {
      return;
    }

    if (typeof value === "string") {
      const result = validateStringInput(value, {
        maxLength: 10000,
        allowSpecialChars: true,
      });
      if (!result.valid) {
        errors.push(`${path}: ${result.error}`);
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        validateValue(item, `${path}[${index}]`);
      });
    } else if (typeof value === "object") {
      for (const [key, val] of Object.entries(value)) {
        validateValue(val, path ? `${path}.${key}` : key);
      }
    }
  }

  validateValue(body);

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}


export function addSecurityHeaders(response: NextResponse): NextResponse {
  

  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.hcaptcha.com https://*.hcaptcha.com https://hcaptcha.com; style-src 'self' 'unsafe-inline' https://*.hcaptcha.com https://hcaptcha.com; img-src 'self' data: https: blob: https://*.hcaptcha.com https://hcaptcha.com; font-src 'self' data: https://*.hcaptcha.com; connect-src 'self' https://hcaptcha.com https://*.hcaptcha.com https://api.hcaptcha.com; frame-src 'self' https://*.hcaptcha.com https://hcaptcha.com;"
  );

  

  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );

  

  response.headers.set("X-Content-Type-Options", "nosniff");

  

  response.headers.set("X-Frame-Options", "DENY");

  

  response.headers.set("X-XSS-Protection", "1; mode=block");

  

  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  

  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );

  return response;
}


