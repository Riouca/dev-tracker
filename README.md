# OdinTracker

OdinTracker is a modern web application that helps you track and follow successful token creators on Odin.fun. The app allows you to identify top creators based on various performance metrics and stay updated with their latest tokens.

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
   git clone https://github.com/yourusername/odin-tracker.git
   cd odin-tracker
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
