# Test Plan for Outreach-AI on Port 3000

- [x] Navigate to http://localhost:3000
- [x] Handle login screen (check for DEMO_MODE or try credentials)
  - Tried test@example.com / password123 -> Incorrect email or password.
  - Switched to "Create account" tab.
  - Filled Full name: Test User, Email: test@example.com, Password: password123.
  - Submitting signup form succeeded.
- [x] Verify main dashboard loads successfully
- [x] Test navigation links
  - [x] Navigate to About / Founder
  - [x] Test Connect Accounts modal (successfully connected Instagram @testbrand)
  - [x] Test Add Leads modal (successfully added John Doe manually)
  - [x] Test New Campaign modal (created Test Instagram Campaign)
  - [x] Launched the campaign successfully (sent 1 message via simulated Instagram)
- [x] Check for errors in UI/Console










