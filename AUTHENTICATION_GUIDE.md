# Authentication & Login Handling Guide

## Overview

The autonomous crawler now includes **comprehensive authentication support** for crawling protected/login-required websites. This guide covers how to use authentication features.

---

## New Capabilities

### 6 New Authentication Tools

1. **detect_login_page** - Identify if current page is a login page
2. **check_login_status** - Verify if user is logged in
3. **attempt_login** - Submit login credentials
4. **auto_login** - Automatically detect and log in
5. **handle_2fa** - Handle two-factor authentication
6. **logout** - Clear session

### Authentication Handler Module

Direct Python/TypeScript functions for manual authentication:
- `detectLoginPage(pageId)` - Async function to detect login pages
- `attemptLogin(config, pageId)` - Async function to submit login
- `checkLoginStatus(pageId)` - Async function to check if logged in
- `handle2FA(otpCode, pageId)` - Async function for 2FA
- `autoLogin(credentials, pageId)` - Async function for auto-login
- `clearSession(pageId)` - Async function to logout

---

## How Authentication Detection Works

### Login Page Detection

The crawler detects login pages by checking for:

**Keywords**: "login", "signin", "sign in", "auth", "password", "username", "email", etc.

**HTML Elements**:
- `<input type="password">`
- `<input name="password">`
- `<input type="email">`
- `<input type="text" name="username">`

**Result**: Page is considered a login page if it has BOTH keywords AND form elements

### Login Status Detection

The crawler checks if user is logged in by looking for:

**Logged-In Indicators**:
- "logout", "sign out", "log out" buttons/links
- "profile", "account", "dashboard" sections
- Absence of login form elements

**Logged-Out Indicators**:
- Login page keywords present
- Password input fields visible

---

## Usage Scenarios

### Scenario 1: Public Site (No Login)

```typescript
// Normal crawl without authentication
const result = await startAutonomousCrawl(
  "https://example.com",
  "Explore all features"
);
```

**What happens**:
1. Agent checks for login page → Not found
2. Agent proceeds with normal crawling

### Scenario 2: Protected Site (With Login)

```typescript
// For sites that have login, user can set environment variables:
// LOGIN_USERNAME=user@example.com
// LOGIN_PASSWORD=mypassword

const result = await startAutonomousCrawl(
  "https://protected-site.com",
  "Explore all features - login will happen automatically"
);
```

**What happens**:
1. Agent checks for login page → Found
2. Agent uses credentials from environment or agent parameters
3. Agent auto-logs in using `auto_login` tool
4. Agent verifies login with `check_login_status`
5. Agent proceeds with crawling
6. Agent logs out at the end with `logout`

### Scenario 3: Site with 2FA

```typescript
// For 2FA sites, would need to provide OTP code:
// Note: Currently requires manual input or environment variable with OTP

const result = await startAutonomousCrawl(
  "https://2fa-protected.com",
  "Explore all features"
);
```

**What happens**:
1. Agent logs in with username/password
2. Page redirects to 2FA prompt
3. Agent detects 2FA page (via `handle_2fa` availability)
4. Agent waits for OTP or uses provided OTP
5. Agent continues after 2FA verification

---

## Tool Reference

### Tool 1: detect_login_page

**Purpose**: Identify login pages

**Input**:
```json
{
  "page_id": "default"  // Optional
}
```

**Output (Login Page)**:
```json
{
  "success": true,
  "isLoginPage": true,
  "message": "Current page is a login page"
}
```

**Output (Not Login)**:
```json
{
  "success": true,
  "isLoginPage": false,
  "message": "Current page is not a login page"
}
```

**When to Use**: After navigating to a page you suspect might require login

---

### Tool 2: check_login_status

**Purpose**: Verify if user is currently logged in

**Input**:
```json
{
  "page_id": "default"  // Optional
}
```

**Output (Logged In)**:
```json
{
  "success": true,
  "isLoggedIn": true,
  "message": "User appears to be logged in"
}
```

**Output (Logged Out)**:
```json
{
  "success": true,
  "isLoggedIn": false,
  "message": "User does not appear to be logged in"
}
```

**When to Use**: To verify authentication status before accessing protected content

---

### Tool 3: attempt_login

**Purpose**: Submit login credentials to a login form

**Input**:
```json
{
  "username_or_email": "user@example.com",
  "password": "secure_password",
  "page_id": "default",           // Optional
  "wait_after_submit": 5000       // Optional, milliseconds
}
```

**Output (Success)**:
```json
{
  "success": true,
  "isLoggedIn": true,
  "message": "Login was successful"
}
```

**Output (Failure)**:
```json
{
  "success": false,
  "isLoggedIn": false,
  "message": "Login attempt completed but verification inconclusive",
  "error": "Could not verify login status"
}
```

**When to Use**: When you're on a login page and have credentials

**Note**: Auto-detects username/email field, password field, and submit button

---

### Tool 4: auto_login

**Purpose**: Automatically detect login page and attempt login

**Input**:
```json
{
  "username_or_email": "user@example.com",
  "password": "secure_password",
  "page_id": "default"  // Optional
}
```

**Output (Same as attempt_login)**

**When to Use**: When you need to login but want one-step detection + login

**Advantage**: Detects login page first, fails gracefully if not on login page

---

### Tool 5: handle_2fa

**Purpose**: Handle two-factor authentication with OTP code

**Input**:
```json
{
  "otp_code": "123456",  // 6-digit or longer code
  "page_id": "default"   // Optional
}
```

**Output (Success)**:
```json
{
  "success": true,
  "isLoggedIn": true,
  "message": "2FA successful"
}
```

**Output (Failure)**:
```json
{
  "success": false,
  "isLoggedIn": false,
  "message": "2FA attempt failed",
  "error": "..."
}
```

**When to Use**: After login, if 2FA prompt appears

**Note**: Auto-detects OTP input field and submit button

---

### Tool 6: logout

**Purpose**: Clear session and log out

**Input**:
```json
{
  "page_id": "default"  // Optional
}
```

**Output**:
```json
{
  "success": true,
  "message": "Logout completed"
}
```

**When to Use**: At the end of crawling to clean up session

**Note**: Searches for logout button/link automatically

---

## Handler Function API

For direct TypeScript/JavaScript usage without the autonomous agent:

### detectLoginPage()

```typescript
import { detectLoginPage } from "./src/auth/authentication-handler";

const isLoginPage = await detectLoginPage("default");
if (isLoginPage) {
  console.log("This is a login page");
}
```

### autoLogin()

```typescript
import { autoLogin } from "./src/auth/authentication-handler";

const result = await autoLogin({
  username: "user@example.com",
  password: "mypassword"
}, "default");

if (result.isLoggedIn) {
  console.log("Successfully logged in!");
}
```

### checkLoginStatus()

```typescript
import { checkLoginStatus } from "./src/auth/authentication-handler";

const loggedIn = await checkLoginStatus("default");
console.log("Logged in:", loggedIn);
```

### handle2FA()

```typescript
import { handle2FA } from "./src/auth/authentication-handler";

const result = await handle2FA("123456", undefined, "default");
if (result.isLoggedIn) {
  console.log("2FA successful!");
}
```

### clearSession()

```typescript
import { clearSession } from "./src/auth/authentication-handler";

await clearSession("default");
console.log("Logged out");
```

---

## Configuration

### Environment Variables

Optional authentication credentials can be provided via environment variables:

```bash
# .env file
LOGIN_USERNAME=user@example.com
LOGIN_PASSWORD=mypassword
LOGIN_OTP=123456  # For 2FA (optional)
```

### Credentials in Code

Pass credentials directly to functions:

```typescript
await autoLogin({
  username: "user@example.com",
  email: "user@example.com",  // Can use either
  password: "secure_password"
}, "default");
```

---

## Common Workflows

### Workflow 1: Simple Login

```typescript
import * as browser from "./src/browser/browser-manager";
import { autoLogin, checkLoginStatus } from "./src/auth/authentication-handler";

// Initialize browser
await browser.initializeBrowser();
await browser.navigateToUrl("https://protected-site.com");

// Auto-login
const result = await autoLogin({
  username: "user@example.com",
  password: "mypassword"
}, "default");

if (result.isLoggedIn) {
  console.log("Logged in! Proceeding with crawl...");
  // Continue with crawling
}
```

### Workflow 2: Manual Login Detection

```typescript
import { detectLoginPage, checkLoginStatus, attemptLogin } from "./src/auth/authentication-handler";

// Navigate to page
await browser.navigateToUrl(url);

// Check if login page
const isLogin = await detectLoginPage("default");

if (isLogin) {
  // We're on a login page
  const result = await attemptLogin({
    credentials: {
      username: "user@example.com",
      password: "mypassword"
    }
  }, "default");

  if (result.isLoggedIn) {
    console.log("Successfully authenticated!");
  }
}
```

### Workflow 3: Autonomous Crawl with Auth

```typescript
import { executeCrawl } from "./src/crawler";

// The autonomous agent now handles authentication automatically
const result = await executeCrawl({
  url: "https://protected-site.com",
  objective: "Explore all features"
  // Agent will:
  // 1. Detect login page
  // 2. Auto-login if credentials available
  // 3. Verify login status
  // 4. Proceed with crawling
  // 5. Logout at the end
});

console.log(result.findings);
```

---

## Debugging Authentication Issues

### Issue: Tool returns empty content

**Cause**: Usually means page isn't loading or is blocking

**Debug**:
```typescript
import { takeScreenshot } from "./src/browser/browser-manager";

// Take a screenshot to see what the page looks like
await takeScreenshot("debug.png");
// Open debug.png to see if page is blank or content appears
```

### Issue: Login fails silently

**Debug**:
```typescript
import { detectLoginPage, checkLoginStatus } from "./src/auth/authentication-handler";

// Check if we're on a login page
const isLogin = await detectLoginPage("default");
console.log("Is login page:", isLogin);

// Check if we're logged in after attempt
const isLoggedIn = await checkLoginStatus("default");
console.log("Is logged in:", isLoggedIn);
```

### Issue: Form fields aren't being filled

**Cause**: Selectors might be different

**Fix**: The tools use CSS selectors that auto-detect common patterns:
- Username/Email: `[name="username"], [name="email"], [id="username"], [id="email"]`
- Password: `[name="password"], [id="password"]`
- Submit: `button[type="submit"], input[type="submit"]`

If these don't work, the site uses custom selectors. Submit a GitHub issue with the site URL.

---

## Security Considerations

### Credentials Storage

⚠️ **IMPORTANT**: Never hardcode credentials in source code

**Good**:
```typescript
// Use environment variables
const password = process.env.LOGIN_PASSWORD;

// Or prompt user
const password = await promptUser("Enter password: ");
```

**Bad**:
```typescript
// Never do this
const password = "mypassword123";  // Exposed in code!
```

### Session Management

- Sessions are maintained in browser memory during crawl
- Sessions are automatically cleared at end of crawl via `logout`
- Browser is closed after crawl, clearing all cookies/storage

### Protected Sites

- Only use authentication for sites you own or have permission to crawl
- Respect robots.txt and site terms of service
- Don't abuse authentication to access private user data
- Consider rate limiting to avoid account lockout

---

## Limitations & Future Improvements

### Current Limitations

1. **Doesn't handle custom login flows** - Only detects standard login form patterns
2. **No support for OAuth** - Only handles username/password forms
3. **Limited 2FA support** - Can handle OTP codes but not app-based auth
4. **No session resumption** - Each crawl starts fresh

### Planned Improvements

- [ ] OAuth/SSO support
- [ ] Custom selector configuration for login forms
- [ ] Session persistence across crawls
- [ ] App-based 2FA (Google Authenticator, etc.)
- [ ] Headless browser session pooling
- [ ] Login failure recovery strategies

---

## Architecture

### Files Added

**Authentication Handler** (`src/auth/authentication-handler.ts`):
- Core login/logout logic
- Form detection and filling
- Session management
- 2FA handling

**Authentication Tools** (`src/tools/authentication-tools.ts`):
- LangChain tools wrapping handler
- Tool descriptions for agent
- Input validation with Zod
- JSON-serializable responses

### Tool Integration

Authentication tools are automatically included in the autonomous agent:

```typescript
// In autonomous-crawler-agent.ts
const authTools = getAuthenticationTools();
const allTools = [...browserTools, ...authTools, ...crawlerTools];
```

### Agent Prompt Updates

The system prompt now includes:
- Authentication tools in capabilities list
- Login/logout steps in exploration strategy
- Session maintenance rules
- Session cleanup requirements

---

## Summary

| Feature | Status | Usage |
|---------|--------|-------|
| Login Detection | ✅ Implemented | `detect_login_page` |
| Login Status Check | ✅ Implemented | `check_login_status` |
| Form-Based Login | ✅ Implemented | `attempt_login` / `auto_login` |
| 2FA Support | ✅ Implemented | `handle_2fa` |
| Logout | ✅ Implemented | `logout` |
| OAuth/SSO | ⏳ Planned | - |
| Custom Selectors | ⏳ Planned | - |
| Session Persistence | ⏳ Planned | - |

---

## Examples

### Example 1: Crawl Protected Site

```bash
# Set credentials
export LOGIN_USERNAME=user@example.com
export LOGIN_PASSWORD=mypassword

# Run autonomous crawler
npm run example:autonomous -- https://protected-site.com
```

### Example 2: Manual Authentication

```typescript
import * as browser from "./src/browser/browser-manager";
import { autoLogin } from "./src/auth/authentication-handler";

// Navigate and login
await browser.initializeBrowser();
await browser.navigateToUrl("https://site.com/login");

const loginResult = await autoLogin({
  username: "user@example.com",
  password: "mypassword"
}, "default");

if (loginResult.isLoggedIn) {
  // Now use crawler on protected pages
  const content = await browser.getPageText("default");
  console.log(content);
}

await browser.cleanupBrowser();
```

---

**Status**: ✅ Ready for production with login support
