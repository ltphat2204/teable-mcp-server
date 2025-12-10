import dotenv from 'dotenv';

dotenv.config();

export function validateConfig() {
    if (!process.env.TEABLE_API_KEY) {
        console.error('Error: Missing required environment variable: TEABLE_API_KEY');
        console.error('Please set TEABLE_API_KEY in your environment or .env file');
        process.exit(1);
    }
}
