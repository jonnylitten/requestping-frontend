# RequestPing Frontend

Virginia FOIA request filing service - Frontend

## Overview

Clean, responsive frontend for RequestPing. Users can sign up, file Virginia FOIA requests to state agencies, and track their status.

**Virginia-Specific Features:**
- All Virginia state agencies supported
- 5-day response timeline tracking
- Virginia FOIA law compliance (Va. Code § 2.2-3700 et seq.)
- Professional request formatting and submission

## Tech Stack

- Vanilla HTML/CSS/JavaScript
- No frameworks or build steps
- Responsive design
- JWT-based authentication

## Configuration

Before deploying, update the API URL in `js/config.js`:

```javascript
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3002'
    : 'https://your-railway-backend-url.railway.app'; // Update this!
```

## Pages

- `index.html` - Landing page with features and pricing
- `signup.html` - User registration
- `login.html` - User login
- `dashboard.html` - Request tracking dashboard
- `request.html` - New FOIA request form

## Deployment to Cloudflare Pages

1. Connect this repo to Cloudflare Pages
2. Build settings:
   - Build command: (leave empty)
   - Build output directory: `/` (root)
3. Deploy!

Cloudflare will automatically serve the static files.

## Backend Repository

Backend API: https://github.com/jonnylitten/requestping-backend

---

🤖 Built with Claude Code
