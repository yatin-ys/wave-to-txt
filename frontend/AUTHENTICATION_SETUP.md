# Authentication Setup Guide

This guide will help you set up authentication for the WaveToTxt application using Supabase.

## Prerequisites

- A Supabase account (sign up at [supabase.com](https://supabase.com))
- Node.js and npm installed

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter a project name (e.g., "wave-to-txt")
5. Enter a database password (save this securely)
6. Choose a region close to your users
7. Click "Create new project"

## 2. Configure Environment Variables

1. Copy the environment template:

   ```bash
   cp env.template .env
   ```

2. In your Supabase dashboard, go to Settings > API
3. Copy the following values to your `.env` file:

   - **Project URL**: Copy to `VITE_SUPABASE_URL`
   - **anon/public key**: Copy to `VITE_SUPABASE_ANON_KEY`

4. Update other environment variables as needed:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   VITE_AUTH_REDIRECT_URL=http://localhost:5173
   VITE_ENABLE_GOOGLE_AUTH=true
   ```

## 3. Configure Google OAuth (Optional)

If you want to enable Google sign-in:

1. Go to your Supabase dashboard
2. Navigate to Authentication > Providers
3. Find "Google" and click the toggle to enable it
4. You'll need to create a Google OAuth app:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable the Google+ API
   - Go to Credentials > Create Credentials > OAuth 2.0 Client IDs
   - Set authorized redirect URIs to: `https://your-project-id.supabase.co/auth/v1/callback`
5. Copy the Client ID and Client Secret to your Supabase Google provider settings

## 4. Set Up Authentication Policies (Optional)

For enhanced security, you can set up Row Level Security (RLS) policies:

1. Go to your Supabase dashboard
2. Navigate to Authentication > Policies
3. Enable RLS on tables that should be user-specific
4. Create policies based on your requirements

## 5. Test the Setup

1. Start your development server:

   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:5173`
3. You should see the authentication form
4. Try creating an account and signing in

## Features Included

### ✅ Email/Password Authentication

- User registration with email confirmation
- Secure password login
- Password strength validation
- Password reset functionality

### ✅ Google OAuth

- One-click Google sign-in
- Automatic profile information import
- Seamless user experience

### ✅ User Interface

- Beautiful ShadCN UI components
- Dark/light theme support
- Responsive design
- Loading states and error handling

### ✅ Security Features

- Secure session management
- Automatic token refresh
- PKCE flow for OAuth
- Input validation and sanitization

### ✅ User Experience

- Toast notifications for all actions
- Persistent login state
- Graceful error handling
- Loading indicators

## Architecture

The authentication system follows these patterns:

### Single-Page Authentication

- Conditional rendering based on auth state
- No routing required
- Smooth transitions

### Context-Based State Management

- Similar to the existing theme provider
- Global authentication state
- Consistent with app architecture

### Error Handling

- Centralized error management
- User-friendly error messages
- Comprehensive logging

## Environment Variables Reference

| Variable                  | Description                   | Required | Default                  |
| ------------------------- | ----------------------------- | -------- | ------------------------ |
| `VITE_SUPABASE_URL`       | Your Supabase project URL     | Yes      | -                        |
| `VITE_SUPABASE_ANON_KEY`  | Your Supabase anon/public key | Yes      | -                        |
| `VITE_AUTH_REDIRECT_URL`  | Redirect URL after auth       | No       | `window.location.origin` |
| `VITE_ENABLE_GOOGLE_AUTH` | Enable Google OAuth           | No       | `false`                  |

## Troubleshooting

### Common Issues

1. **"Missing Supabase environment variables" error**

   - Ensure `.env` file exists and has correct values
   - Check that variables start with `VITE_`
   - Restart your development server

2. **Google OAuth not working**

   - Verify Google provider is enabled in Supabase
   - Check redirect URLs match exactly
   - Ensure `VITE_ENABLE_GOOGLE_AUTH=true`

3. **Email confirmation not working**

   - Check Supabase email templates
   - Verify SMTP settings in Supabase
   - Check spam folder

4. **Session not persisting**
   - Clear browser storage and cookies
   - Check Supabase project settings
   - Verify environment variables

### Getting Help

- Check the browser console for detailed error messages
- Review Supabase dashboard logs
- Ensure all dependencies are installed: `npm install`

## Security Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **RLS Policies**: Consider enabling Row Level Security for user data
3. **Email Verification**: Require email confirmation for new accounts
4. **Password Policy**: Enforce strong passwords (implemented in the form)
5. **Session Management**: Tokens are automatically refreshed by Supabase

The authentication system is now ready to use! Users will see the login form when not authenticated and the main application when logged in.
