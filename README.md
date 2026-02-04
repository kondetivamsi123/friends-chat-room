# Setup Instructions for MFA & Chat

This project consists of an Odoo backend module and a React frontend.

## 1. Backend Setup (Odoo)

1.  **Locate the Module**: The module is located at `backend_odoo/custom_mfa_chat`.
2.  **Add to Addons**: Copy or symlink the `backend_odoo` folder to your Odoo addons path.
3.  **Install/Update**:
    - Start Odoo.
    - Go to Apps, update app list.
    - Search for 'Custom MFA'.
    - Install "Custom MFA & Chat".
4.  **Configure User**:
    - Go to Settings -> Users.
    - Open your user (e.g., Administrator).
    - In the "MFA Settings" tab (or Security tab), check "MFA Enabled" and enter a secret (e.g., `123456`).

## 2. Frontend Setup (React)

1.  **Navigate directly**: `cd frontend_chat`
2.  **Install**: `npm install` (Already done)
3.  **Start**: `npm run dev`

## 3. Usage

1.  Open the frontend URL (usually http://localhost:5173).
2.  **Login**: Enter your Odoo credentials (e.g., `admin` / `admin`).
3.  **MFA**: If enabled, enter the secret code you set (e.g., `123456`).
4.  **Chat**: Join automatically and start chatting!

## Notes

- **CORS**: The Odoo controller is set to `cors='*'`. Ensure your Odoo configuration (`odoo.conf`) allows cors if strict mode is on, or run Odoo with `--dev=all`.
- **Polling**: Chat uses polling (3s). Real-time updates via WebSockets require Odoo Bus handling which is more complex for this demo.
