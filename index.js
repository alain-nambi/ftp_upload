import ftp from "basic-ftp"
import dotenv from "dotenv"
import fs from "fs"

// Load configurations from .env file
dotenv.config()

// Retrieve configuration from environment variables
const CONFIG = {
    HOST: process.env.FTP_HOST,
    USER: process.env.FTP_USER,
    PASSWORD: process.env.FTP_PASSWORD,
    PORT: parseInt(process.env.FTP_PORT),
    SECURE: process.env.FTP_SECURE === "true",
}

// Function to connect to the FTP server
const connectFTP = async (host, user, port, password, secure) => {
    const FTPClient =  new ftp.Client()
    
    // Enable verbose logging for debugging purposes
    // FTPClient.ftp.verbose = true

    try {
        // Connect to the FTP server
        console.log(`Connecting to FTP server at ${host}:${port}...`);
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

        console.log('Connected to FTP server successfully.');

        return FTPClient;
    } catch (error) {
        console.error(`>> Error connecting to FTP server: ${error.message}`);
        throw error; // Rethrow the error to handle it further up
    }
}

// Function to list files and directories on the FTP server
const showLists = async (client) => {
    try {
        console.log('Fetching directory listing...')
        const list = await client.list()
        console.log('Directory listing fetched successfully.')
        return list;
    } catch (error) {
        console.error(`Error fetching directory listing: ${error.message}`);
        throw error; // Rethrow the error to handle it further up
    }
}

// Function to get file size in megabytes
const getFileSizeInMB = (filepath) => {
    const stats = fs.statSync(filepath)
    return (stats.size / (1024 * 1024)).toFixed(2)
}

// Function to upload a file to the FTP server
const uploadFile = async (client, localPath, remotePath) => {
    try {
        console.log(`Uploading file from ${localPath} to ${remotePath}`)

        const fileSizeInMB = getFileSizeInMB(localPath) // Get file size in MB

        client.trackProgress(info => {
            console.log(`File: ${info.name} \nSize : ${fileSizeInMB} MB`);
            // console.log(`Transferred: ${info.bytes} bytes`);
            // console.log(`Transferred Overall: ${info.bytesOverall} bytes`);
            console.log(`Progress : ${(info.bytesOverall / (fileSizeInMB * 1024 * 1024) * 100).toFixed(2)}%`)
        })

        await client.uploadFrom(localPath, remotePath)

        // Stop tracking progress
        client.trackProgress();

        console.log('File upload successfully')
    } catch (error) {
        console.error(`Error uploading file : ${error.message}`)
        throw error; // Rethrow the error to handle it further up
    }
}

// Main functions to run the FTP Operations
const main = async () => {
    try {
        const FPT_CLIENT = await connectFTP(
            CONFIG.HOST,
            CONFIG.USER,
            CONFIG.PORT,
            CONFIG.PASSWORD,
            CONFIG.SECURE
        )

        const directoryList = await showLists(FPT_CLIENT)
        console.log('Directory List : ', directoryList)

        await uploadFile(FPT_CLIENT, 'test.mkv', 'test.mkv')

        // Close the FTP connection
        FPT_CLIENT.close()
        console.log('FTP connection closed.');
    } catch (error) {
        console.error(`Error in FTP operations : ${error.message}`)
    }
}

// Run the main functions
main()