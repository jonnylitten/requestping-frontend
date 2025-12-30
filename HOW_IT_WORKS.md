# RequestPing - How It Works

## Overview

RequestPing is a Virginia FOIA request automation service that helps users file professional FOIA requests to Virginia state agencies. The system handles authentication, request formatting, submission, and tracking.

---

## System Architecture

### **Frontend** (Vanilla JS/HTML/CSS)
- Static site hosted on Cloudflare Pages
- No build process - pure HTML/CSS/JavaScript
- Communicates with backend API via REST

### **Backend** (Node.js/Express)
- REST API server
- SQLite database for data persistence
- Email delivery via Resend API
- JWT-based authentication

### **Email Provider** (Resend)
- Sends magic link authentication emails
- Submits FOIA requests to Virginia agencies
- All emails from: `FROM_EMAIL` environment variable

---

## Complete User Flow

### **1. Authentication (Magic Link)**

**User Journey:**
1. User visits landing page → clicks "Login"
2. Enters email address (must be whitelisted: `jk@litten.org` or `jj@litten.org`)
3. Backend generates magic link token and sends email
4. User clicks link in email
5. Frontend verifies token and receives JWT
6. JWT stored in localStorage for future requests

**Technical Flow:**
```
POST /api/auth/request-link
  ↓
Backend generates crypto.randomBytes(32) token
  ↓
Stores in magic_links table with 15-min expiration
  ↓
Sends email via Resend with link: /auth?token=xxx
  ↓
User clicks link
  ↓
POST /api/auth/verify-link
  ↓
Backend validates token, marks as used
  ↓
Returns JWT signed with JWT_SECRET (30-day expiration)
```

**Database Tables Used:**
- `users` - Email, subscription status, request limits
- `magic_links` - One-time tokens with expiration

---

### **2. Viewing Available Agencies**

**User Journey:**
1. User navigates to "New Request" page
2. Dropdown loads list of Virginia state agencies
3. User selects target agency (e.g., "Department of Motor Vehicles")

**Technical Flow:**
```
GET /api/agencies
  ↓
Backend loads agencies from va-agencies.js
  ↓
Returns 20 Virginia state agencies with:
  - Agency name
  - Abbreviation (DMV, VSP, etc.)
  - FOIA email contact
  - Phone number
  - NextRequest portal URL (if applicable)
  - Description
```

**Agency Data Source:**
- `api/va-agencies.js` - Static configuration file
- 7 agencies with confirmed email contacts
- 3 agencies using NextRequest portals
- 10 agencies with phone contacts (emails need verification)

---

### **3. Creating a FOIA Request**

**User Journey:**
1. User fills out request form:
   - Selects Virginia state agency
   - Enters request subject (e.g., "DMV accident reports for I-95")
   - Provides detailed description with specificity
   - Optional: Date range for records
   - Selects delivery format (electronic/paper/either)
   - Optional: Requests fee waiver with justification
   - Acknowledges fee policy (5-hour threshold)

2. Submits form

**Technical Flow:**
```
POST /api/requests (with JWT in Authorization header)
  ↓
Backend validates JWT → extracts user_id
  ↓
Checks monthly request limit (5 requests per month)
  ↓
Generates UUID for request
  ↓
Inserts into requests table:
  - Request details (subject, description, dates)
  - Agency info (abbreviation, name)
  - Status: 'pending'
  - User ID
  ↓
Logs activity: "request_created"
  ↓
Looks up agency email from va-agencies.js
  ↓
If email exists → calls submitVAFOIARequest()
If portal only → logs "portal_required"
```

**Database Tables Used:**
- `requests` - All request data and status
- `activity_log` - Timeline of request events

---

### **4. Email Submission to Agency**

**Technical Flow:**
```
submitVAFOIARequest(requestId, agency, details)
  ↓
Generates Virginia FOIA email body:
  - Legal citation: Va. Code § 2.2-3700 et seq.
  - Requested records description
  - Date range (if specified)
  - Delivery format preference
  - Fee waiver request (if requested)
  - 5-day response deadline reminder
  - Signature: "RequestPing, on behalf of a Virginia constituent"
  ↓
Sends email via Resend API:
  - To: agency.email (e.g., foia@dmv.virginia.gov)
  - From: process.env.FROM_EMAIL
  - Subject: "Virginia FOIA Request: [subject]"
  ↓
Updates request status → 'submitted'
Sets submitted_at timestamp
  ↓
Logs activity: "request_submitted"
```

**Email Template Example:**
```
To Whom It May Concern:

This is a request under the Virginia Freedom of Information Act
(Va. Code § 2.2-3700 et seq.).

REQUESTED RECORDS:

[User's detailed description]

DATE RANGE:
[start date] to [end date]

DELIVERY FORMAT:
I request that the responsive records be provided in electronic format (PDF).

FEES:
Please notify me before processing this request if fees will exceed
five hours of staff time, per Virginia FOIA fee guidelines.

Under Virginia FOIA, I understand you have five working days to respond
to this request. Please acknowledge receipt and provide an estimated
timeline for production of the requested records.

Thank you for your attention to this matter.

Sincerely,

RequestPing
On behalf of a Virginia constituent
[FROM_EMAIL]
```

---

### **5. Request Tracking & Dashboard**

**User Journey:**
1. User navigates to Dashboard
2. Sees list of all their requests with status badges
3. Can click into specific request for details

**Technical Flow:**
```
GET /api/requests (with JWT)
  ↓
Backend queries requests WHERE user_id = [from JWT]
  ↓
Joins with documents table to count received files
  ↓
Returns array of requests with:
  - Subject, description
  - Agency name
  - Status (pending, submitted, processing, completed, rejected)
  - Tracking number (if assigned by agency)
  - Timestamps (created, submitted, completed)
  - Document count
  ↓
Frontend displays as cards with color-coded status badges
```

**Request Detail View:**
```
GET /api/requests/:id (with JWT)
  ↓
Backend validates user owns this request
  ↓
Returns:
  - Full request details
  - Associated documents (if any)
  - Activity log timeline
```

**Possible Statuses:**
- **pending** - Created but not yet submitted
- **submitted** - Sent to agency, awaiting response
- **processing** - Agency acknowledged, working on it
- **completed** - Documents received
- **rejected** - Request denied

---

## Key Technical Details

### **Authentication & Security**
- **Magic Links:** 15-minute expiration, one-time use
- **JWT Tokens:** 30-day expiration, stored in localStorage
- **Whitelist:** Only `jk@litten.org` and `jj@litten.org` can sign up
- **Authorization:** All API routes check JWT via `authenticateToken()` middleware

### **Request Limits**
- **Default:** 5 requests per month per user
- **Stored in:** `users.monthly_request_limit` column
- **Checked:** On every POST /api/requests

### **Virginia FOIA Compliance**
- **Response Timeline:** 5 working days (can extend to 12 with notice)
- **Fee Structure:** First 5 hours of staff time are free
- **Legal Citation:** Va. Code § 2.2-3700 et seq.
- **Requester:** RequestPing (Virginia resident) files on behalf of users

### **Agency Database**
- **Source:** `api/va-agencies.js` (static configuration)
- **20 Agencies:** Mix of email and portal-based
- **Email Agencies:** Can submit automatically
- **Portal Agencies:** Logged but not auto-submitted (future enhancement)

### **Database Schema**
```
users
  ├─ id (UUID)
  ├─ email (unique)
  ├─ subscription_status
  └─ monthly_request_limit

magic_links
  ├─ token (unique, 15-min TTL)
  ├─ email
  └─ used_at

requests
  ├─ id (UUID)
  ├─ user_id (FK → users)
  ├─ agency + agency_name
  ├─ subject + description
  ├─ date_range_start/end
  ├─ status
  └─ timestamps

documents
  ├─ id (UUID)
  ├─ request_id (FK → requests)
  ├─ filename + file_path
  └─ received_at

activity_log
  ├─ id (UUID)
  ├─ request_id (FK → requests)
  ├─ activity_type
  └─ description
```

---

## Environment Variables Required

### **Backend (.env)**
```bash
PORT=3000                          # API server port
DB_PATH=./database/requestping.db  # SQLite database location
JWT_SECRET=your-secret-key         # JWT signing key
RESEND_API_KEY=re_xxxxx            # Resend API key
FROM_EMAIL=noreply@yourdomain.com  # Sender email
FRONTEND_URL=https://yourdomain.com # For magic link URLs
```

### **Frontend (js/config.js)**
```javascript
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3002'
    : 'https://your-railway-backend-url.railway.app';
```

---

## Email Flow Summary

1. **Magic Link Email** → User clicks → Login
2. **FOIA Request Email** → Agency receives → Agency responds (external)
3. **Agency Response** → (Currently manual - user receives direct from agency)

**Future Enhancement:** Capture agency responses via dedicated email inbox and auto-update request status.

---

## Request Lifecycle Example

**User wants DMV accident reports:**

1. **Login:** User enters `jk@litten.org` → receives magic link → clicks → logged in
2. **Create:** User selects "Department of Motor Vehicles" from dropdown
3. **Fill Form:**
   - Subject: "Accident reports for I-95 southbound"
   - Description: "All accident reports for I-95 southbound between mile markers 50-60 from January 1, 2025 to March 31, 2025"
   - Date range: 2025-01-01 to 2025-03-31
   - Format: Electronic (PDF)
   - No fee waiver
4. **Submit:** User clicks "Submit Request"
5. **Backend Processing:**
   - Creates request record (ID: abc-123)
   - Logs activity: "request_created"
   - Looks up DMV email: `foia@dmv.virginia.gov`
   - Generates Virginia FOIA email
   - Sends via Resend
   - Updates status: 'submitted'
   - Logs activity: "request_submitted to Department of Motor Vehicles"
6. **User Dashboard:** Shows request with "Submitted" status badge
7. **Agency Receives:** DMV FOIA officer gets email, processes request
8. **Future:** User checks dashboard, sees updates (manual for now)

---

## File Structure

```
requestping-frontend/
  ├── index.html              # Landing page
  ├── login.html              # Magic link entry
  ├── auth.html               # Magic link verification
  ├── dashboard.html          # Request tracking
  ├── request.html            # New request form
  ├── js/
  │   ├── config.js           # API URL configuration
  │   ├── auth.js             # Magic link verification
  │   ├── login.js            # Login form handler
  │   ├── dashboard.js        # Request list display
  │   └── request.js          # Form submission
  └── css/style.css           # Styling

requestping-backend/
  ├── api/
  │   ├── server.js           # Main Express app
  │   └── va-agencies.js      # Virginia agency database
  ├── database/
  │   ├── schema.sql          # Database schema
  │   └── requestping.db      # SQLite database
  └── package.json
```

---

## Next Steps / Future Enhancements

1. **Agency Response Tracking:** Dedicated email inbox to capture agency responses
2. **Portal Integration:** Auto-submit to NextRequest portals via API
3. **Request Templates:** Pre-written templates for common requests (DMV records, police reports, etc.)
4. **Multi-state Support:** Expand to Maryland, DC, North Carolina
5. **Analytics Dashboard:** Track response times by agency, fee frequency, success rates
6. **Public Request Search:** Optional public database of successful requests (anonymized)

---

**That's how RequestPing works!** 🎉

Simple, focused Virginia FOIA automation with clean architecture and room to grow.
