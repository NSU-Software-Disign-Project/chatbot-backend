# Chatbot Backend

A Node.js/TypeScript backend for a collaborative chatbot editor with real-time WebSocket support.

## Features

- 🔐 User authentication with JWT
- 📊 Project management with MongoDB
- 🔄 Real-time collaborative editing via WebSocket
- 🤖 Chatbot interpreter with multiple block types
- 🛡️ Error handling and validation
- 🐳 Docker support

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd chatbot-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:

   ```env
   # Database Configuration
   DATABASE_URL="mongodb://localhost:27017/chatbot"

   # Server Configuration
   PORT=8080
   NODE_ENV=development

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

   # Frontend URL for CORS
   FRONTEND_URL=http://localhost:3000
   ```

4. **Set up the database**

   ```bash
   # Generate Prisma client
   npx prisma generate

   # Run database migrations
   npx prisma db push

   # (Optional) Seed the database
   npx prisma db seed
   ```

## Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
```

### Using Docker

```bash
docker-compose up -d
```

## API Endpoints

### Authentication

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user info (protected)
- `GET /auth/my-projects` - Get user's projects (protected)

### Projects

- `POST /api/project/:name` - Save project configuration (protected)
- `GET /api/projects` - Get all projects
- `GET /api/project/:name` - Get project by name
- `DELETE /api/project/:name` - Delete project
- `GET /api/project/:name/active-users` - Get active users in project

### Health Check

- `GET /health` - Server health status

## WebSocket Events

### Project Namespace (`/project`)

- `editOperation` - Broadcast edit operations to other users
- `leaveProject` - Notify when user leaves project
- `userJoined` - Notify when new user joins
- `userLeft` - Notify when user leaves
- `userDisconnected` - Notify when user disconnects

## Testing

### Run all tests

```bash
npm run test-server
npm run test-auth
npm run test-collaborative
npm run demo-collaborative
```

### Test individual components

```bash
# Test server health
node test-server.js

# Test authentication
node test-auth.js

# Test registration
node test-registration.js

# Test collaborative editing
node test-collaborative.js

# Run collaborative editing demo
node demo-collaborative.js
```

## Project Structure

```
src/
├── app.ts                 # Main application entry point
├── boundary/              # Interface layer
│   ├── io/               # Input/Output interfaces
│   ├── routes/           # Express routes
│   └── websocket/        # WebSocket services
├── control/              # Business logic layer
│   ├── api/              # API controllers
│   ├── db/               # Database operations
│   └── interpreter/      # Chatbot interpreter
├── entity/               # Data models
└── services/             # Utility services
```

## Troubleshooting

### Common Issues

1. **Prisma Client Generation Error**

   ```bash
   # Delete node_modules and reinstall
   rm -rf node_modules
   npm install
   npx prisma generate
   ```

2. **MongoDB Connection Issues**

   - Ensure MongoDB is running
   - Check DATABASE_URL in .env
   - For Atlas, ensure IP is whitelisted

3. **Port Already in Use**

   - Change PORT in .env
   - Or kill the process using the port

4. **JWT Token Issues**
   - Ensure JWT_SECRET is set in .env
   - Check token expiration

### Logs

The application logs important events:

- Server startup/shutdown
- User connections/disconnections
- WebSocket events
- Database operations
- Errors and exceptions

## Development

### Code Style

- TypeScript strict mode enabled
- ESLint for code linting
- Prettier for code formatting

### Adding New Features

1. Create feature branch
2. Add tests for new functionality
3. Update documentation
4. Submit pull request

## License

MIT License - see LICENSE file for details.
