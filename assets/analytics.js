/**
 * Vercel Web Analytics initialization
 * This script initializes Vercel Web Analytics for the Peace of Mind Institut website
 */

import { inject } from '../node_modules/@vercel/analytics/dist/index.mjs';

// Inject Vercel Analytics
// This will automatically track page views and is privacy-friendly
inject();
