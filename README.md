# ForsetiScan

ForsetiScan is a modern web application that helps you track and follow successful token creators on Odin.fun. Named after Forseti, the Norse god of justice and reconciliation, this app aims to promote fairness and transparency by identifying the most successful and trustworthy token creators.

## About Forseti

In Norse mythology, Forseti is the god of justice, reconciliation, and truth. As the son of Baldr and Nanna, he presides over disputes and makes fair judgments. His hall, Glitnir, has pillars of gold and a roof of silver, symbolizing the purity and value of justice. ForsetiScan embodies these principles by providing transparent metrics to evaluate token creators.

## Features

- **Track Top Creators**: Discover the most successful token creators based on volume, transactions, and success rate.
- **Creator Performance Metrics**: View detailed statistics for each creator, including total volume, transaction count, and success rate.
- **Follow System**: Follow your favorite creators to keep track of their latest tokens.
- **Token Feed**: See a consolidated feed of the latest tokens from creators you follow.
- **Responsive Design**: Enjoy a seamless experience on both desktop and mobile devices.

## Technologies Used

- React
- TypeScript
- Vite
- Modern CSS (with custom properties and flexbox/grid layouts)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/forseti-scan.git
   cd forseti-scan
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Build for production:
   ```
   npm run build
   ```

## Current Limitations

- The application currently uses mock data when API endpoints are unavailable.
- Some Odin.fun API endpoints may return 404 errors, in which case the app falls back to alternative data sources or mock data.
- The follow system is currently implemented using localStorage and does not sync across devices.

## Future Improvements

- Implement authentication to allow users to sync their followed creators across devices.
- Add more detailed analytics for token performance.
- Integrate with Telegram for notifications about new tokens from followed creators.
- Implement a dark/light theme toggle.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This is an unofficial tool for Odin.fun. Use at your own risk.

## Caching Strategy

The application uses Redis for shared caching to reduce API request load. We implement a tiered caching strategy with different expiry times:

- Dashboard data: 20 minutes
- Most Recent Tokens (newest 4): 20 seconds 
- Older Recent Tokens (5-30): 5 minutes

This ensures up-to-the-minute coverage of brand new tokens while still maintaining efficient API usage for older data.

### Redis Setup

1. Install Redis on your local machine or use a Redis service
2. Start Redis server: `redis-server`
3. The server automatically connects to Redis at `redis://localhost:6379`

### Running the Application

```bash
# Install dependencies
cd dev-tracker
npm install
cd server
npm install

# Start the server and frontend together
cd ..
npm run dev:full

# Or start them separately
# Terminal 1: Start the server
npm run server

# Terminal 2: Start the frontend
npm run dev
```
