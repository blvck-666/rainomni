import "dotenv/config";
import fs from "fs";
import axios from "axios";
import { gql, GraphQLClient } from "graphql-request";

const OMNIVORE_API_URL =
  process.env.OMNIVORE_API_URL ?? "https://api-prod.omnivore.app/api/graphql";
const RAINDROP_API_URL = "https://api.raindrop.io/rest/v1";
const TIMESTAMP_FILE = "last_sync_timestamp.txt";
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

const uploadImportFileMutation = gql`
  mutation UploadImportFile(
    $type: UploadImportFileType!
    $contentType: String!
  ) {
    uploadImportFile(type: $type, contentType: $contentType) {
      ... on UploadImportFileError {
        errorCodes
      }
      ... on UploadImportFileSuccess {
        uploadSignedUrl
      }
    }
  }
`;

function getLastSyncTimestamp() {
  try {
    if (fs.existsSync(TIMESTAMP_FILE)) {
      return parseInt(fs.readFileSync(TIMESTAMP_FILE, "utf8"));
    }
  } catch (error) {
    console.error("Error reading timestamp:", error);
  }
  return 0;
}

function saveLastSyncTimestamp(timestamp) {
  try {
    fs.writeFileSync(TIMESTAMP_FILE, timestamp.toString());
  } catch (error) {
    console.error("Error saving timestamp:", error);
  }
}

async function fetchRaindropBookmarks() {
  const lastSync = getLastSyncTimestamp();
  try {
    const response = await axios.get(`${RAINDROP_API_URL}/raindrops/0`, {
      headers: {
        Authorization: `Bearer ${process.env.RAINDROP_API_TOKEN}`,
      },
      params: {
        perpage: 50,
        sort: "-created",
        search: "article",
        created: `>${new Date(lastSync).toISOString()}`,
      },
    });

    if (response.status !== 200) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.data.items) {
      throw new Error("No items found in the response");
    }

    // Update last sync timestamp if we got articles
    if (response.data.items.length > 0) {
      const newestTimestamp = Math.max(
        ...response.data.items.map((item) => new Date(item.created).getTime()),
      );
      saveLastSyncTimestamp(newestTimestamp);
    }

    return response.data.items;
  } catch (error) {
    if (error.response) {
      console.error("Error data:", error.response.data);
      console.error("Error status:", error.response.status);
      console.error("Error headers:", error.response.headers);
    } else if (error.request) {
      console.error("Error request:", error.request);
    } else {
      console.error("Error message:", error.message);
    }
    console.error("Error config:", error.config);
    throw error;
  }
}

function escapeCSV(field) {
  if (field === null || field === undefined) {
    return "";
  }
  field = field.toString();
  if (field.includes('"') || field.includes(",") || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function convertToCSV(bookmarks) {
  const header = "url,state,labels,saved_at,published_at\n";
  const rows = bookmarks
    .map((bookmark) => {
      const url = escapeCSV(bookmark.link);
      const state = "SUCCEEDED";
      let labels = "";
      if (bookmark.tags && bookmark.tags.length > 0) {
        const escapedTags = bookmark.tags.map(
          (tag) => `"${tag.replace(/"/g, '""')}"`,
        );
        labels = escapeCSV(`[${escapedTags.join(",")}]`);
      }
      const saved_at = bookmark.created
        ? new Date(bookmark.created).getTime()
        : "";
      const published_at = "";

      return `${url},${state},${labels},${saved_at},${published_at}`;
    })
    .join("\n");

  return header + rows;
}

async function uploadToOmnivore(csvContent) {
  console.log("Connecting to Omnivore API...");
  if (!process.env.OMNIVORE_API_TOKEN) {
    throw new Error(
      "No Omnivore auth token found. Did you forget to add it to the .env file?",
    );
  }

  const client = new GraphQLClient(OMNIVORE_API_URL, {
    headers: {
      Authorization: process.env.OMNIVORE_API_TOKEN,
    },
  });

  const importFile = Buffer.from(csvContent);

  const response = await client.request(uploadImportFileMutation, {
    type: "URL_LIST",
    contentType: "text/csv",
  });

  if (response && response.uploadImportFile.uploadSignedUrl) {
    try {
      await axios.put(response.uploadImportFile.uploadSignedUrl, importFile, {
        headers: {
          "content-type": "text/csv",
          "content-length": importFile.byteLength,
        },
      });
      console.log("Successfully uploaded import file to Omnivore.");
    } catch (err) {
      console.error("Error uploading to Omnivore:", err);
      throw err;
    }
  } else {
    console.error("Error response from Omnivore:", response);
    throw new Error("Failed to get upload URL from Omnivore");
  }
}

async function syncBookmarks() {
  try {
    console.log("\n--- Starting sync check ---");
    console.log("Fetching bookmarks from Raindrop.io...");
    const bookmarks = await fetchRaindropBookmarks();

    if (bookmarks.length === 0) {
      console.log("No new bookmarks found.");
      return;
    }

    console.log(`Found ${bookmarks.length} new bookmarks.`);
    const csvContent = convertToCSV(bookmarks);

    // Optional: Save CSV file for debugging
    fs.writeFileSync("last_import.csv", csvContent);

    await uploadToOmnivore(csvContent);
  } catch (error) {
    console.error("Error during sync:", error);
  }
}

async function main() {
  console.log("Starting Raindrop to Omnivore sync service...");

  while (true) {
    await syncBookmarks();
    console.log(`Waiting ${SYNC_INTERVAL / 1000} seconds before next sync...`);
    await new Promise((resolve) => setTimeout(resolve, SYNC_INTERVAL));
  }
}

// Error handling for the main loop
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error);
});

main().catch(console.error);
