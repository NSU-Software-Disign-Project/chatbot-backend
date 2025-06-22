# Collaborative Editing System - Rebuilt

## Overview

This document describes the rebuilt collaborative editing system for the chatbot project. The system enables real-time collaborative editing of GoJS diagrams with multiple users, similar to Google Docs.

## Architecture

### Frontend Components

1. **CollaborativeEditingService** (`chatbot-frontend/src/services/CollaborativeEditingService.js`)

   - Manages WebSocket connections
   - Handles connection state and reconnection
   - Provides methods for sending edit operations
   - Manages event callbacks

2. **GoJSCollaborativeIntegration** (`chatbot-frontend/src/services/GoJSCollaborativeIntegration.js`)

   - Integrates GoJS diagrams with collaborative editing
   - Handles local and remote edit operations
   - Manages event listeners and cleanup
   - Provides operation queuing for consistency

3. **useCollaborativeEditing Hook** (`chatbot-frontend/src/hooks/useCollaborativeEditing.js`)

   - React hook for managing collaborative editing state
   - Provides connection status and active users
   - Offers utility methods for common operations

4. **CollaborativeEditingUI** (`chatbot-frontend/src/components/CollaborativeEditingUI.js`)
   - UI component for displaying connection status
   - Shows active users and connection controls
   - Provides error display and status indicators

### Backend Components

1. **WebSocketService** (`chatbot-backend/src/boundary/websocket/WebSocketService.ts`)
   - Manages WebSocket connections and namespaces
   - Handles user connections and disconnections
   - Processes edit operations and broadcasts them
   - Manages database updates with operation queuing

## Features

### ✅ Implemented Features

1. **Real-time Collaboration**

   - Multiple users can edit the same diagram simultaneously
   - Changes are broadcast to all connected users in real-time
   - Support for both authenticated and anonymous users

2. **Operation Types**

   - `nodeAdd`: Add new nodes to the diagram
   - `nodeDelete`: Remove nodes from the diagram
   - `nodeMove`: Move nodes to new positions
   - `nodeUpdate`: Update node properties
   - `linkAdd`: Add connections between nodes
   - `linkDelete`: Remove connections
   - `textChange`: Update text content
   - `portChange`: Update port configurations

3. **Connection Management**

   - Automatic reconnection on connection loss
   - Connection status tracking and display
   - User join/leave notifications
   - Error handling and recovery

4. **Data Synchronization**

   - Operation queuing to ensure consistency
   - Database updates with proper error handling
   - Fresh data loading for new users
   - Conflict resolution for concurrent edits

5. **User Management**
   - Support for authenticated users (project namespace)
   - Support for anonymous users (collaborative namespace)
   - Display names for anonymous users
   - Active user tracking

## Usage

### Frontend Integration

1. **Basic Setup**

```javascript
import { useCollaborativeEditing } from '../hooks/useCollaborativeEditing';
import GoJSCollaborativeIntegration from '../services/GoJSCollaborativeIntegration';

const MyComponent = () => {
  const { isConnected, connectionStatus, activeUsers, connect, disconnect } =
    useCollaborativeEditing(projectId, userId);

  useEffect(() => {
    if (isConnected && diagram) {
      const integration = new GoJSCollaborativeIntegration(diagram);
      integration.setupGoJSEventListeners();

      return () => integration.cleanup();
    }
  }, [isConnected, diagram]);

  return (
    <div>
      <CollaborativeEditingUI
        isConnected={isConnected}
        connectionStatus={connectionStatus}
        activeUsers={activeUsers}
        onConnect={() => connect()}
        onDisconnect={disconnect}
        projectId={projectId}
        userId={userId}
      />
    </div>
  );
};
```

2. **Anonymous User Setup**

```javascript
import collaborativeEditingService from '../services/CollaborativeEditingService';

const connectAnonymous = async (shareToken, displayName) => {
  try {
    await collaborativeEditingService.connectWithShareToken(
      shareToken,
      displayName,
    );
    console.log('Connected as anonymous user');
  } catch (error) {
    console.error('Failed to connect:', error);
  }
};
```

### Backend Configuration

1. **WebSocket Service Setup**

```typescript
import { WebSocketService } from './src/boundary/websocket/WebSocketService';

const httpServer = createServer(app);
const webSocketService = new WebSocketService(httpServer);

// Start the service
webSocketService.start();

// Stop the service (on shutdown)
webSocketService.stop();
```

2. **Database Schema**
   The system requires the following fields in the Project model:

```prisma
model Project {
  id            String       @id @default(auto()) @map("_id") @db.ObjectId
  projectId     String?      @unique
  name          String       @unique
  nodeDataArray Json[]
  linkDataArray Json[]
  shareToken    String?      @unique
  isCollaborative Boolean    @default(false)
  // ... other fields
}
```

## API Reference

### CollaborativeEditingService

#### Methods

- `connect(projectId, userId, options?)`: Connect to project namespace
- `connectWithShareToken(shareToken, displayName?)`: Connect as anonymous user
- `disconnect()`: Disconnect from collaborative editing
- `sendEditOperation(type, data)`: Send edit operation
- `sendNodeAdd(nodeData)`: Send node add operation
- `sendNodeDelete(nodeId)`: Send node delete operation
- `sendNodeMove(nodeId, x, y)`: Send node move operation
- `sendNodeUpdate(nodeId, updates)`: Send node update operation
- `sendLinkAdd(linkData)`: Send link add operation
- `sendLinkDelete(linkId)`: Send link delete operation
- `sendTextChange(nodeId, text)`: Send text change operation
- `sendPortChange(nodeId, portId, value)`: Send port change operation

#### Events

- `onEditOperation(callback)`: Listen for edit operations
- `onUserJoined(callback)`: Listen for user join events
- `onUserLeft(callback)`: Listen for user leave events
- `onConnectionStatus(callback)`: Listen for connection status changes
- `onProjectData(callback)`: Listen for project data updates

### GoJSCollaborativeIntegration

#### Constructor

```javascript
new GoJSCollaborativeIntegration(diagram, { onNodeDelete });
```

#### Methods

- `setupGoJSEventListeners()`: Set up GoJS event listeners
- `cleanup()`: Clean up event listeners and resources
- `getState()`: Get current integration state

## Testing

### Running Tests

1. **Start the backend server**

```bash
cd chatbot-backend
npm start
```

2. **Run the collaborative editing tests**

```bash
cd chatbot-backend
node test-collaborative-rebuilt.js
```

### Test Coverage

The test suite covers:

- Connection establishment for both namespaces
- User join/leave notifications
- Edit operation broadcasting
- Collaborative namespace operations
- Disconnection handling
- Error scenarios

## Troubleshooting

### Common Issues

1. **Connection Failures**

   - Check if the backend server is running
   - Verify the WebSocket URL is correct
   - Check network connectivity
   - Review server logs for errors

2. **Operations Not Syncing**

   - Ensure both users are connected to the same project/room
   - Check if operations are being sent (check console logs)
   - Verify the GoJS integration is properly set up
   - Check for JavaScript errors in the browser console

3. **Database Update Issues**

   - Check database connectivity
   - Verify the project exists in the database
   - Review server logs for database errors
   - Check if the shareToken is valid

4. **Performance Issues**
   - Monitor operation queue size
   - Check for memory leaks in long-running sessions
   - Verify WebSocket connection stability
   - Consider implementing operation batching for high-frequency updates

### Debug Mode

Enable debug logging by setting the log level in the browser console:

```javascript
localStorage.setItem('debug', 'collaborative:*');
```

## Performance Considerations

1. **Operation Batching**

   - The system uses operation queuing to batch database updates
   - Multiple operations are processed together to reduce database load

2. **Connection Management**

   - Automatic reconnection with exponential backoff
   - Connection pooling for multiple users

3. **Memory Management**
   - Proper cleanup of event listeners
   - Operation queue size limits
   - User connection cleanup on disconnect

## Security Considerations

1. **Authentication**

   - Project namespace requires valid projectId and userId
   - Collaborative namespace requires valid shareToken

2. **Data Validation**

   - All operations are validated before processing
   - Malformed operations are rejected

3. **Access Control**
   - Users can only access projects they have permission for
   - Anonymous users require valid share tokens

## Future Enhancements

1. **Conflict Resolution**

   - Implement operational transformation for better conflict handling
   - Add version control for diagram states

2. **Performance Optimizations**

   - Implement operation compression
   - Add support for large diagrams with pagination

3. **Additional Features**
   - Cursor tracking for other users
   - Undo/redo functionality
   - Comment system
   - Version history

## Contributing

When contributing to the collaborative editing system:

1. Follow the existing code structure and patterns
2. Add comprehensive tests for new features
3. Update this documentation for any changes
4. Ensure backward compatibility when possible
5. Test with multiple users and different scenarios

## Support

For issues or questions about the collaborative editing system:

1. Check the troubleshooting section above
2. Review the server and browser console logs
3. Run the test suite to verify functionality
4. Create an issue with detailed error information
