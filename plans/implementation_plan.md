# Implementation Plan - typeauthd Telegram Bot

This plan outlines the development of a Telegram bot using Node.js and Telegraf to manage `typeauthd` records.

## Goals
- **Single Master Message UX**: All interactions happen in one message to reduce clutter.
- **Access Control**: Only Telegram users listed in `settings.ini` can use the bot.
- **Smart Search**: Find users by UID, Discord ID, or nickname with similarity matching.
- **API Integration**: Complete integration with `typeauthd` endpoints for managing users.
- **Robust Navigation**: Consistent "Back" buttons and clear menu structure.

## Technical Stack
- **Node.js**: Runtime environment.
- **Telegraf**: Telegram Bot API framework.
- **Axios**: For making HTTP requests to `typeauthd` API.
- **ini**: For parsing the `settings.ini` configuration file.
- **fuse.js**: For implementing the "smart search" (fuzzy similarity matching).

## Implementation Steps

### Phase 1: Project Setup & Configuration
1. Initialize a new Node.js project.
2. Install dependencies: `telegraf`, `axios`, `ini`, `fuse.js`, `dotenv`.
3. Create a configuration utility to read `settings.ini` and provide structured access to tokens and authorized IDs.

### Phase 2: Core Bot Infrastructure
1. Setup the Telegraf bot instance.
2. Implement **Access Control Middleware**: Verify every update against the allowed IDs in `settings.ini`.
3. Implement **State Management**: Since we use a "master message" approach, we need to track the user's current menu state and message ID. We'll use Telegraf sessions (in-memory for now).
4. Implement **Master Message Utility**: A helper function to edit the existing message with new content and inline keyboards, or send a new one if the old one is deleted/unavailable.

### Phase 3: typeauthd API Client
1. Create an API wrapper for `typeauthd` using Axios.
2. Implement methods for all routes: `getUuid`, `identify`, `getRoles`, `getGuilds`, `getExtra`, `patchExtra`, `deleteUser`, `generateLink`.
3. **Investigation**: Search for a "list all users" endpoint (e.g., `/api/users` or `/api/list`) to enable fuzzy search. If no such endpoint exists, provide a search by exact ID and inform the user.

### Phase 4: UX & Menus
1. **Main Menu**: Options for "Search User", "Create Link", "System Info".
2. **Search Flow**:
   - Ask for search term (text input).
   - Display top 5 matches with inline buttons.
3. **User Profile View**:
   - Display UID, Discord ID, and info from `identify`.
   - Sub-menu for Roles, Guilds, Extra Data.
   - Action: **Delete Binding** (with confirmation).
4. **Link Generation**:
   - Prompt for UID.
   - Display the generated authorization link.

### Phase 5: Smart Search Implementation
1. If a list endpoint is found: Fetch all users and use `fuse.js` to perform fuzzy matching on nicknames/IDs.
2. If no list endpoint: Implement loose matching if the API supports it, otherwise fallback to exact lookups.

### Phase 6: Refinement & Validation
1. Add "Back" buttons to all sub-menus.
2. Ensure "master message" consistency (delete user messages after input).
3. Error handling: Gracefully display API errors to the user.
4. Testing: Verify all routes and access control.

## Project Structure
- `src/`
  - `index.js`: Entry point.
  - `config.js`: Configuration loader.
  - `api.js`: `typeauthd` API wrapper.
  - `menus.js`: Inline keyboard generators.
  - `search.js`: Fuzzy search logic.
  - `middleware/`
    - `auth.js`: Access control.
- `settings.ini`: Configuration (existing).
- `package.json`: Dependencies.

## Verification Plan
1. Start bot and attempt access from an unauthorized ID (should be blocked).
2. Access from an authorized ID (should see Main Menu).
3. Search for a user and verify the results.
4. View a user's roles and extra data.
5. Create an authorization link and verify it.
6. Delete a record and verify it's gone.
