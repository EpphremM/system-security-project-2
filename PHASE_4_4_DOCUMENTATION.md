# Phase 4.4: Rule-Based Access Control (RuBAC)

## Overview

Implementation of Rule-Based Access Control (RuBAC) with conditional access based on context. Supports time-based, location-based, and device-based rules with emergency override capabilities.

## Features Implemented

### 1. Time-Based Rules ✅

- **Working Hours**: 8:00-18:00 Mon-Fri (configurable)
- **Days of Week**: Restrict access to specific days
- **Holiday Schedules**: Exclude holidays from access
- **Emergency Override**: Bypass time restrictions in emergencies
- **Time-Limited Access**: Rules with validity periods

### 2. Location-Based Rules ✅

- **IP Whitelist**: Office network IP ranges (CIDR notation)
- **Geographic Restrictions**: Country-based allow/block lists
- **VPN Requirement**: Require VPN connection for external access
- **Office Network Requirement**: Require connection from office network
- **Mobile Device Location**: Geographic location verification

### 3. Device-Based Rules ✅

- **Company-Managed Device**: Require company-managed devices
- **OS Requirements**: Specific operating systems
- **OS Version Requirements**: Minimum OS versions
- **Browser Requirements**: Specific browsers
- **Browser Version Requirements**: Minimum browser versions
- **Anti-Malware Check**: Require anti-malware software
- **Encrypted Storage**: Require encrypted storage
- **Trust Level**: Device trust level requirements

## Database Schema

### AccessRule Model
```prisma
model AccessRule {
  id          String   @id @default(uuid())
  name        String
  ruleType    RuleType // TIME_BASED, LOCATION_BASED, DEVICE_BASED, COMPOSITE
  config      Json     // Rule-specific configuration
  enabled     Boolean
  priority    Int
  emergencyOverride Boolean
  validFrom   DateTime?
  validUntil  DateTime?
}
```

### HolidaySchedule Model
```prisma
model HolidaySchedule {
  id          String   @id @default(uuid())
  name        String
  startDate   DateTime
  endDate     DateTime
  type        HolidayType
  isRecurring Boolean
  recurrencePattern Json?
}
```

### IPWhitelist Model
```prisma
model IPWhitelist {
  id          String   @id @default(uuid())
  name        String
  ipRanges    String[] // CIDR notation
  location    String?
  enabled     Boolean
}
```

### DeviceProfile Model
```prisma
model DeviceProfile {
  id          String   @id @default(uuid())
  userId      String
  deviceId    String   @unique
  deviceType  DeviceType
  os          String?
  osVersion   String?
  browser     String?
  browserVersion String?
  isCompanyManaged Boolean
  hasAntiMalware Boolean
  hasEncryptedStorage Boolean
  trustLevel  TrustLevel
  lastSeen    DateTime
}
```

## API Routes

### Rule Management

#### `POST /api/access/rubac/rules/create`
Create access rule.

**Request:**
```json
{
  "name": "Working Hours Only",
  "description": "Access only during business hours",
  "ruleType": "TIME_BASED",
  "config": {
    "workingHours": {
      "start": "08:00",
      "end": "18:00"
    },
    "daysOfWeek": [1, 2, 3, 4, 5],
    "excludeHolidays": true
  },
  "enabled": true,
  "priority": 10,
  "emergencyOverride": true
}
```

#### `POST /api/access/rubac/rules/evaluate`
Evaluate rule against current context.

**Request:**
```json
{
  "ruleId": "rule-uuid",
  "deviceId": "device-uuid",
  "deviceInfo": {
    "os": "Windows",
    "osVersion": "11.0",
    "browser": "Chrome",
    "browserVersion": "120.0"
  },
  "geoLocation": {
    "country": "US",
    "city": "New York"
  }
}
```

### Holiday Management

#### `POST /api/access/rubac/holidays`
Create holiday schedule.

**Request:**
```json
{
  "name": "New Year's Day",
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-01-01T23:59:59Z",
  "type": "PUBLIC_HOLIDAY",
  "isRecurring": true,
  "recurrencePattern": {
    "type": "yearly",
    "month": 1,
    "day": 1
  }
}
```

#### `GET /api/access/rubac/holidays?startDate=...&endDate=...`
Get holidays in date range.

### IP Whitelist

#### `POST /api/access/rubac/ip-whitelist`
Create IP whitelist.

**Request:**
```json
{
  "name": "Office Network",
  "description": "Main office IP ranges",
  "ipRanges": ["192.168.1.0/24", "10.0.0.0/8"],
  "location": "Office Building A",
  "enabled": true
}
```

#### `GET /api/access/rubac/ip-whitelist`
Get all enabled IP whitelists.

### Device Management

#### `POST /api/access/rubac/device/register`
Register device.

**Request:**
```json
{
  "deviceId": "unique-device-id",
  "deviceName": "John's Laptop",
  "deviceType": "LAPTOP",
  "os": "Windows",
  "osVersion": "11.0",
  "browser": "Chrome",
  "browserVersion": "120.0",
  "isCompanyManaged": true,
  "hasAntiMalware": true,
  "hasEncryptedStorage": true
}
```

#### `GET /api/access/rubac/device`
Get user's devices.

#### `POST /api/access/rubac/device`
Update device trust level.

**Request:**
```json
{
  "deviceId": "device-uuid",
  "trustLevel": "TRUSTED"
}
```

#### `DELETE /api/access/rubac/device`
Block device.

**Request:**
```json
{
  "deviceId": "device-uuid",
  "reason": "Security concern"
}
```

## Utility Functions

### RuBAC Functions (`src/lib/access/rubac.ts`)

- `evaluateTimeRule()` - Evaluate time-based rules
- `isHoliday()` - Check if date is a holiday
- `evaluateLocationRule()` - Evaluate location-based rules
- `evaluateDeviceRule()` - Evaluate device-based rules
- `evaluateCompositeRule()` - Evaluate multiple rules
- `evaluateAccessRule()` - Evaluate access rule

### Device Functions (`src/lib/access/device.ts`)

- `registerDevice()` - Register or update device
- `updateDeviceTrustLevel()` - Update device trust
- `getUserDevices()` - Get user's devices
- `blockDevice()` - Block device

## Rule Types

### Time-Based Rules

**Configuration:**
```typescript
{
  workingHours: {
    start: "08:00",
    end: "18:00"
  },
  daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  timezone: "America/New_York",
  excludeHolidays: true,
  emergencyOverride: true
}
```

**Features:**
- Working hours enforcement
- Day of week restrictions
- Holiday exclusion
- Emergency override
- Timezone support

### Location-Based Rules

**Configuration:**
```typescript
{
  ipWhitelistIds: ["whitelist-uuid"],
  requireVPN: true,
  requireOfficeNetwork: false,
  allowedCountries: ["US", "CA"],
  blockedCountries: ["CN", "RU"],
  emergencyOverride: true
}
```

**Features:**
- IP whitelist checking
- VPN requirement
- Office network requirement
- Geographic restrictions
- Country allow/block lists

### Device-Based Rules

**Configuration:**
```typescript
{
  requireCompanyManaged: true,
  requireOS: ["Windows", "macOS"],
  requireOSVersion: [
    { os: "Windows", minVersion: "10.0" },
    { os: "macOS", minVersion: "12.0" }
  ],
  requireBrowser: ["Chrome", "Firefox"],
  requireBrowserVersion: [
    { browser: "Chrome", minVersion: "120.0" }
  ],
  requireAntiMalware: true,
  requireEncryptedStorage: true,
  minTrustLevel: "VERIFIED",
  blockedDevices: ["device-uuid"],
  emergencyOverride: true
}
```

**Features:**
- Company-managed device requirement
- OS and version requirements
- Browser and version requirements
- Security software checks
- Trust level requirements
- Device blocking

### Composite Rules

Combine multiple rule types with AND logic:
```typescript
{
  rules: [
    { type: "TIME_BASED", config: { ... } },
    { type: "LOCATION_BASED", config: { ... } },
    { type: "DEVICE_BASED", config: { ... } }
  ]
}
```

## Middleware

### RuBAC Enforcement (`src/middleware/rubac.ts`)

```typescript
enforceRuBAC(
  request: NextRequest,
  resourceType: string,
  resourceId: string,
  action: string
): Promise<{ allowed: boolean; response?: NextResponse }>
```

**Usage:**
```typescript
const rubacCheck = await enforceRuBAC(request, "visitor", visitorId, "read");
if (!rubacCheck.allowed) {
  return rubacCheck.response;
}
```

## Usage Examples

### Create Time-Based Rule
```typescript
await prisma.accessRule.create({
  data: {
    name: "Business Hours Only",
    ruleType: "TIME_BASED",
    config: {
      workingHours: { start: "08:00", end: "18:00" },
      daysOfWeek: [1, 2, 3, 4, 5],
      excludeHolidays: true,
    },
  },
});
```

### Create Location-Based Rule
```typescript
await prisma.accessRule.create({
  data: {
    name: "Office Network Only",
    ruleType: "LOCATION_BASED",
    config: {
      ipWhitelistIds: [officeNetworkId],
      requireOfficeNetwork: true,
    },
  },
});
```

### Create Device-Based Rule
```typescript
await prisma.accessRule.create({
  data: {
    name: "Company Devices Only",
    ruleType: "DEVICE_BASED",
    config: {
      requireCompanyManaged: true,
      requireAntiMalware: true,
      requireEncryptedStorage: true,
      minTrustLevel: "VERIFIED",
    },
  },
});
```

### Evaluate Rule
```typescript
const result = await evaluateAccessRule(ruleId, {
  ipAddress: "192.168.1.100",
  userId: userId,
  deviceId: deviceId,
  deviceInfo: {
    os: "Windows",
    osVersion: "11.0",
  },
  geoLocation: {
    country: "US",
  },
  currentTime: new Date(),
});
```

## Security Features

1. **Emergency Override**: Rules can be bypassed in emergencies
2. **Priority System**: Higher priority rules evaluated first
3. **Time-Limited Rules**: Rules with validity periods
4. **Device Trust Levels**: Trust-based device access
5. **IP Whitelisting**: Network-based access control
6. **Geographic Restrictions**: Country-based access control
7. **Device Blocking**: Block specific devices
8. **Audit Logging**: All rule evaluations logged

## Best Practices

1. **Rule Priority**: Set appropriate priorities for rule evaluation
2. **Emergency Procedures**: Document emergency override procedures
3. **Holiday Management**: Keep holiday schedules up to date
4. **IP Management**: Regularly review and update IP whitelists
5. **Device Trust**: Regularly review device trust levels
6. **Testing**: Test rules in non-production first
7. **Documentation**: Document all rules and their purposes
8. **Monitoring**: Monitor rule violations and access patterns

## Future Enhancements

- [ ] Advanced time patterns (recurring, complex schedules)
- [ ] Geolocation API integration
- [ ] Device fingerprinting
- [ ] Behavioral analysis
- [ ] Risk-based access
- [ ] Machine learning for anomaly detection
- [ ] Rule templates
- [ ] Visual rule builder
- [ ] Rule analytics and reporting



