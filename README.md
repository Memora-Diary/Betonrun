# BetOnRun

A web application that allows users to create and participate in running challenges using Strava integration. Users can stake money on their commitment to run every day for a month.

## Features

- Strava authentication
- Create running challenges with stakes
- Join existing challenges
- Automatic run verification through Strava
- Track progress and completion status
- Beautiful and responsive UI

## Prerequisites

- Python 3.8+
- Node.js 16+
- npm
- Strava API credentials

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd betonrun
```

2. Set up the backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

3. Create a `.env` file in the backend directory with your Strava API credentials:
```
SECRET_KEY=your-secret-key-here
STRAVA_CLIENT_ID=your-strava-client-id
STRAVA_CLIENT_SECRET=your-strava-client-secret
STRAVA_REDIRECT_URI=http://localhost:5000/auth/strava/callback
```

4. Set up the frontend:
```bash
cd ../frontend
npm install
```

5. Start the development servers:

Backend:
```bash
cd backend
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
python run.py
```

Frontend:
```bash
cd frontend
npm run dev
```

6. Open your browser and navigate to `http://localhost:3000`

## Tech Stack

- Backend:
  - Flask
  - Strava API
  - Python-dotenv
  - Stravalib

- Frontend:
  - Next.js 14
  - TypeScript
  - Tailwind CSS
  - Axios

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 