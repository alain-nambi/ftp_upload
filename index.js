import ftp from "basic-ftp";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import logger from "./logger.js"; // Import the logger

// Load configurations from .env file
dotenv.config();

// Retrieve configuration from environment variables
const CONFIG = {
    HOST: process.env.FTP_HOST,
    USER: process.env.FTP_USER,
    PASSWORD: process.env.FTP_PASSWORD,
    PORT: parseInt(process.env.FTP_PORT),
    SECURE: process.env.FTP_SECURE === "true",
};

// Function to connect to the FTP server
const connectFTP = async (host, user, port, password, secure) => {
    const FTPClient = new ftp.Client();

    // Set a custom timeout value (e.g., 5 minutes)
    /**
     * The 425 Error while transferring data: ECONNABORTED - Connection aborted typically indicates that the FTP connection was interrupted or closed unexpectedly during a file or folder transfer. This could be due to several reasons:
        Possible Causes

        Network Issues: Temporary network disruptions or poor connectivity might be causing the connection to drop.
        Server Configuration: The FTP server might have limitations or settings that are interrupting long transfers.
        Client Configuration: Misconfigured FTP client settings could lead to interruptions in data transfer.
        Firewall/Security Software: Firewalls or security software could be blocking or interrupting FTP connections.
     */
    FTPClient.ftp.timeout = 5 * 60 * 1000; // 5 minutes in milliseconds


    // FTPClient.ftp.verbose = true; // Enable verbose logging for debugging purposes

    try {
        // Connect to the FTP server
        logger.info(`Connecting to FTP server at ${host}:${port}...`);
        await FTPClient.access({
            host,
            user,
            password,
            port,
            secure,
            secureOptions: {
                rejectUnauthorized: false, // Disable certificate validation (use cautiously)
            },
        });
        logger.info("Connected to FTP server successfully.");
        return FTPClient;
    } catch (error) {
        logger.error(`>> Error connecting to FTP server: ${error.message}`);
        throw error; // Rethrow the error to handle it further up
    }
};

// Function to list files and directories on the FTP server
const showLists = async (client) => {
    try {
        logger.info("Fetching directory listing...");
        const list = await client.list();
        logger.info("Directory listing fetched successfully.");
        return list;
    } catch (error) {
        logger.error(`Error fetching directory listing: ${error.message}`);
        throw error; // Rethrow the error to handle it further up
    }
};

// Function to get file size in megabytes
const getFileSizeInMB = (filepath) => {
    const stats = fs.statSync(filepath);
    return (stats.size / (1024 * 1024)).toFixed(2);
};

// Function to check if a folder should be ignored
const ignoreFolder = (localPath) => {
    const ignoreFolders = ["node_modules", ".git"];
    return ignoreFolders.some((folder) => localPath.includes(folder));
};

// Function to upload a folder to the FTP server
const uploadFolder = async (client, localPath, remotePath) => {
    if (ignoreFolder(localPath) || !fs.statSync(localPath).isDirectory()) {
        logger.info(`Ignoring folder: ${localPath}`);
        return;
    }

    try {
        const files = fs.readdirSync(localPath);
        for (const file of files) {
            const fullLocalPath = path.join(localPath, file);
            const fullRemotePath = path.join(remotePath, file);

            if (fs.statSync(fullLocalPath).isDirectory()) {
                await uploadFolder(client, fullLocalPath, fullRemotePath);
            } else {
                await uploadFile(client, fullLocalPath, fullRemotePath);
            }
        }
    } catch (error) {
        logger.error(`Error uploading folder: ${error.message}`);
        throw error; // Rethrow the error to handle it further up
    }
};

// Function to upload a file to the FTP server
const uploadFile = async (client, localPath, remotePath) => {
    try {
        logger.info(`Uploading file from ${localPath} to ${remotePath}`);

        const fileSizeInMB = getFileSizeInMB(localPath); // Get file size in MB

        // Ensure the remote directory exists
        const remoteDir = path.dirname(remotePath);
        await client.ensureDir(remoteDir);

        // Track the progress of the upload
        client.trackProgress((info) => {
            logger.info(`File: ${info.name} \nSize: ${fileSizeInMB} MB | ${info.bytesOverall} Bytes`);
            logger.info(`Progress: ${info.bytesOverall > 0 && (info.bytesOverall / (fileSizeInMB * 1024 * 1024) * 100).toFixed(2)}%`);
        });

        // Upload the file
        await client.uploadFrom(localPath, remotePath);

        // Stop tracking progress
        client.trackProgress();

        logger.info("File uploaded successfully.");
    } catch (error) {
        logger.error(`Error uploading file: ${error.message}`);
        throw error; // Rethrow the error to handle it further up
    }
};

// Main function to run the FTP operations
const main = async () => {
    try {
        // Connect to the FTP server
        const FTP_CLIENT = await connectFTP(
            CONFIG.HOST,
            CONFIG.USER,
            CONFIG.PORT,
            CONFIG.PASSWORD,
            CONFIG.SECURE
        );

        // Fetch and display directory listing from the FTP server
        const directoryList = await showLists(FTP_CLIENT);
        // Convert directoryList to a JSON string
        const directoryListString = JSON.stringify(directoryList, null, 2);
        logger.info(`Directory List \n ${directoryListString}`, );

        // Specify the local and remote paths for uploading
        const localPath = "/home/alain/Vidéos/ftp_upload_backup"; // Local folder path
        const remotePath = "/ftp_upload_backup"; // Remote folder path

        // Upload the folder
        await uploadFolder(FTP_CLIENT, localPath, remotePath);

        // Close the FTP connection
        FTP_CLIENT.close();
        logger.info("FTP connection closed.");
    } catch (error) {
        logger.error(`Error in FTP operations: ${error.message}`);
    }
};

// Run the main function
main();
