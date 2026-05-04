# NAU Internal Voting System - Fully Functional Version

This version keeps the existing design and fixes the functional flow for:

- Admin election creation
- Admin role creation
- Candidate application
- Candidate approval/rejection
- Voting page
- Duplicate vote prevention
- Result publishing
- Result viewing
- Dashboard counts and activity logs

## 1. Supabase Setup

Open Supabase SQL Editor and run:

```txt
backend/sql/database.sql
```

This resets the test database and creates the final working schema.

## 2. Backend Setup

Open `backend/.env` and paste your real Supabase values:

```env
PORT=5000
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_your_real_secret_key_here
JWT_SECRET=123456789
```

Important:

- Use `sb_secret_...` in backend only.
- Do not use `sb_publishable_...` here.
- Do not include `/rest/v1/` in the Supabase URL.

Install and run:

```bash
cd backend
npm install
npm run dev
```

Backend test URL:

```txt
http://localhost:5000/
```

## 3. Frontend Setup

Open the `frontend` folder using VS Code Live Server.

Start with:

```txt
frontend/index.html
```

The frontend API URL is in:

```txt
frontend/js/api.js
```

Default:

```js
const API_BASE_URL = 'http://localhost:5000/api';
```

## 4. Correct Testing Flow

### Step 1: Register Admin

Go to `register.html` and create an Admin account.

### Step 2: Login Admin

Login using admin credentials.

### Step 3: Create Election

In Admin Dashboard:

- Add title
- Add description
- Add chapter name
- Add venue
- Select valid start time and end time
- Set status as `active` if you want voting to work immediately

### Step 4: Add Election Role

Example:

- Role Name: President
- Max Winners: 1

### Step 5: Register Candidate

Register a Candidate account or a Voter account and submit a candidate application.

### Step 6: Approve Candidate

Login as Admin and approve the pending candidate application.

### Step 7: Register Voter

Register a separate Voter account.

### Step 8: Vote

Login as Voter and open voting page.

Rules:

- Election must be active.
- Current time must be between start and end time.
- Candidate must be approved.
- One voter can vote only once per role.

### Step 9: Publish Results

Login as Admin and click Publish.

### Step 10: View Results

Voters can view results only after admin publishes them.

## 5. Common Errors

### Permission denied for table users

Run `backend/sql/database.sql` again.

### Invalid API key

Use the full `sb_secret_...` key in backend `.env`.

### Election not creating

Check start/end time. End time must be after start time.

### No candidates showing in vote page

Admin must approve candidate first.

### Voting not working

Election status must be `active`, and current time must be inside the voting window.


## Correct Testing Flow

1. Register an admin account and login.
2. Create an election with Status = Active.
3. Make sure the Start Time is before current time and End Time is after current time.
4. Add one or more roles.
5. Register a candidate account and apply for a role.
6. Login as admin and approve the candidate application.
7. Register/login as a voter and open Vote page.
8. Select election, select candidate, submit vote.
9. Admin can preview results anytime. Voters can view results only after Admin clicks Publish Results.

If vote submission fails, check these first:
- Election status must be active.
- Current time must be inside start/end time.
- Candidate must be approved.
- User must not have already voted for that role.
"# nau-voting-system" 
