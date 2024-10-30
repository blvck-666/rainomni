# Raindrop to Omnivore Sync

A Node.js application that automatically syncs your saved articles from Raindrop.io to Omnivore. When you save a new article in Raindrop.io, this program will automatically detect and import it into your Omnivore account.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
  - [Getting Your API Tokens](#getting-your-api-tokens)
- [Installation](#installation)
- [Usage](#usage)
  - [Running Locally](#running-locally)
  - [Running as a Service](#running-as-a-service-linuxubuntu)
  - [Customization](#customization)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [License](#license)
- [Support](#support)

## Features

- 🔄 Automatic synchronization of new articles from Raindrop.io to Omnivore
- 🏷️ Preserves article tags during synchronization
- ⏱️ Configurable sync interval (default: every 5 minutes)
- 💾 Maintains sync state between runs to avoid duplicates
- 📝 Detailed logging for monitoring sync status
- 🔑 Secure API token handling through environment variables

## Prerequisites

Before you begin, ensure you have:

- [Node.js](https://nodejs.org/) installed (v14 or higher)
- A [Raindrop.io](https://raindrop.io/) account with API access
- An [Omnivore](https://omnivore.app/) account

### Getting Your API Tokens

<details>
<summary>Raindrop.io API Token</summary>

1. Go to [Raindrop.io Integration](https://app.raindrop.io/settings/integrations)
2. Click on "Create new app"
3. Fill in the app details
4. Copy the "Test token" - this will be your `RAINDROP_API_TOKEN`
</details>

<details>
<summary>Omnivore API Token</summary>

1. Log in to your Omnivore account
2. Go to Settings → API
3. Generate a new API token
4. Copy the token - this will be your `OMNIVORE_API_TOKEN`
</details>

## Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/yourusername/raindrop-omnivore-sync.git
   cd raindrop-omnivore-sync
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the project root:
   ```env
   RAINDROP_API_TOKEN=your_raindrop_token
   OMNIVORE_API_TOKEN=your_omnivore_token
   ```

## Usage

### Running Locally

1. Start the sync service:

   ```bash
   npm start
   ```

2. The program will:
   - Check for new articles every 5 minutes
   - Log sync status and any errors
   - Automatically retry on failures
   - Save sync state to avoid duplicates

### Running as a Service (Linux/Ubuntu)

1. Create a service file:

   ```bash
   sudo nano /etc/systemd/system/raindrop-omnivore-sync.service
   ```

2. Add the following content (replace paths and username):

   ```ini
   [Unit]
   Description=Raindrop to Omnivore Sync Service
   After=network.target

   [Service]
   ExecStart=/usr/bin/node /path/to/your/index.js
   Restart=always
   User=yourusername
   Environment=NODE_ENV=production
   Environment=RAINDROP_API_TOKEN=your_token
   Environment=OMNIVORE_API_TOKEN=your_token

   [Install]
   WantedBy=multi-user.target
   ```

3. Enable and start the service:

   ```bash
   sudo systemctl enable raindrop-omnivore-sync
   sudo systemctl start raindrop-omnivore-sync
   ```

4. Check service status:

   ```bash
   sudo systemctl status raindrop-omnivore-sync
   ```

5. View logs:
   ```bash
   journalctl -u raindrop-omnivore-sync -f
   ```

### Customization

You can modify these settings in `index.js`:

```javascript
// Change sync interval (default: 5 minutes)
const SYNC_INTERVAL = 5 * 60 * 1000; // in milliseconds

// Change number of articles fetched per sync
params: {
  perpage: 50, // maximum number of articles per fetch
  ...
}
```

## Troubleshooting

<details>
<summary><strong>Common Issues</strong></summary>

1. **No articles being synced**

   - Check if your API tokens are correct in `.env`
   - Verify you have new articles in Raindrop.io
   - Check the console logs for errors

2. **Duplicate articles**

   - Delete `last_sync_timestamp.txt` to reset sync state
   - Restart the service

3. **Connection errors**
   - Check your internet connection
   - Verify API endpoints are accessible
   - Check if API tokens are still valid
   </details>

<details>
<summary><strong>Logs</strong></summary>

The program creates these files:

- `last_import.csv`: Latest imported articles
- `last_sync_timestamp.txt`: Timestamp of last successful sync
</details>

<p align="center">
Made with ❤️ by <a href="https://github.com/blvck-666">BLVCK666</a>
</p>
