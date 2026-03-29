---
title: "Real-Time Data with WebSockets"
estimatedMinutes: 35
---

# Real-Time Data with WebSockets

HTTP is a request-response protocol. The client sends a request, the server sends a response, and the connection closes. This works perfectly for loading a page or submitting a form. But what about data that changes continuously? If 15 people RSVP to a Gather event while you are viewing it, you will not see those updates unless you refresh the page or your application polls the server repeatedly.

WebSockets solve this by establishing a persistent, bidirectional connection between the client and server. Once connected, either side can send messages at any time without the overhead of new HTTP requests. This enables features like live attendee counts, real-time RSVP feeds, and instant notifications.

In this lesson, you will learn how WebSockets work at the protocol level, build a reusable `useWebSocket` hook with TypeScript, integrate WebSocket messages with TanStack Query's cache, and handle reconnection with exponential backoff. By the end, Gather will have live attendee counts and a real-time RSVP feed.

---

## WebSocket Fundamentals

### HTTP vs WebSocket

HTTP follows a strict request-response cycle:

```
Client                    Server
  |--- GET /events -------->|
  |<--- 200 OK + JSON ------|
  |                         |
  (connection closed)
```

If you want updated data, you open a new connection and make another request. Polling (fetching every few seconds) works but wastes bandwidth when nothing has changed.

WebSockets start as an HTTP request, then upgrade to a persistent connection:

```
Client                    Server
  |--- GET /ws (Upgrade) -->|
  |<--- 101 Switching ------|
  |                         |
  |<== message ===>|  (bidirectional, persistent)
  |<== message ===>|
  |<== message ===>|
  |                         |
  (stays open until explicitly closed)
```

### The Upgrade Handshake

A WebSocket connection begins with an HTTP request that includes an `Upgrade: websocket` header:

```
GET /ws HTTP/1.1
Host: gather.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

The server responds with HTTP 101 (Switching Protocols), and from that point forward, the connection speaks the WebSocket protocol instead of HTTP. Data flows as lightweight "frames" in both directions, with minimal overhead (just 2-6 bytes of framing per message, compared to hundreds of bytes of HTTP headers per request).

### When to Use WebSockets

WebSockets are the right choice when:

- Data changes frequently and users need to see updates in near-real-time (attendee counts, chat messages, live scores)
- The server needs to push data to the client without being asked (notifications, alerts)
- You need low-latency bidirectional communication (collaborative editing, multiplayer games)

WebSockets are overkill when:

- Data changes infrequently (TanStack Query's staleTime + background refetch is sufficient)
- You only need server-to-client updates with some delay (Server-Sent Events are simpler)
- The data is only needed once per page load (regular HTTP fetch)

For Gather, WebSockets make sense for live attendee counts and the real-time RSVP feed. They would not make sense for loading the event list (which TanStack Query handles well).

---

## The Browser WebSocket API

Before building a React hook, understand the raw browser API:

```typescript
// Open a connection
const ws = new WebSocket('wss://gather.example.com/ws');

// Connection opened
ws.addEventListener('open', () => {
  console.log('Connected');
  ws.send(JSON.stringify({ type: 'subscribe', eventId: 'evt_001' }));
});

// Receive a message
ws.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
});

// Connection closed
ws.addEventListener('close', (event) => {
  console.log('Disconnected:', event.code, event.reason);
});

// Error
ws.addEventListener('error', (event) => {
  console.error('WebSocket error:', event);
});

// Close the connection
ws.close();
```

The four lifecycle events are `open`, `message`, `close`, and `error`. The `readyState` property tells you the current state: `CONNECTING` (0), `OPEN` (1), `CLOSING` (2), or `CLOSED` (3).

Always use `wss://` (WebSocket Secure) in production, just as you use `https://` for HTTP.

---

## Building a Typed useWebSocket Hook

A production-ready WebSocket hook needs to handle connection lifecycle, typed messages, automatic reconnection, and cleanup on unmount. Here is the full implementation:

```typescript
// src/hooks/useWebSocket.ts
import { useEffect, useRef, useCallback, useState } from 'react';

interface UseWebSocketOptions<T> {
  url: string;
  onMessage: (data: T) => void;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  shouldReconnect?: boolean;
  maxReconnectAttempts?: number;
  enabled?: boolean;
}

interface UseWebSocketReturn {
  send: (data: unknown) => void;
  isConnected: boolean;
  reconnectAttempt: number;
}

export function useWebSocket<T>({
  url,
  onMessage,
  onOpen,
  onClose,
  onError,
  shouldReconnect = true,
  maxReconnectAttempts = 5,
  enabled = true,
}: UseWebSocketOptions<T>): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // Store callbacks in refs to avoid reconnecting when they change
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const connect = useCallback(() => {
    if (!enabled) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.addEventListener('open', () => {
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
      setReconnectAttempt(0);
      onOpenRef.current?.();
    });

    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data) as T;
        onMessageRef.current(data);
      } catch {
        console.error('Failed to parse WebSocket message:', event.data);
      }
    });

    ws.addEventListener('close', (event) => {
      setIsConnected(false);
      onCloseRef.current?.(event);

      // Reconnect if the close was not intentional
      if (shouldReconnect && !event.wasClean) {
        attemptReconnect();
      }
    });

    ws.addEventListener('error', (event) => {
      onErrorRef.current?.(event);
    });
  }, [url, enabled, shouldReconnect]);

  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.warn(`WebSocket: max reconnect attempts (${maxReconnectAttempts}) reached`);
      return;
    }

    reconnectAttemptsRef.current += 1;
    setReconnectAttempt(reconnectAttemptsRef.current);

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);

    console.log(
      `WebSocket: reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [maxReconnectAttempts, connect]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket: cannot send, connection is not open');
    }
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      // Clear any pending reconnect timers
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      // Close the connection cleanly
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
      }
    };
  }, [connect]);

  return { send, isConnected, reconnectAttempt };
}
```

Key design decisions in this hook:

**Callbacks in refs.** The `onMessage` callback is stored in a ref (`onMessageRef`) so that the `connect` function's identity does not change when the callback changes. Without this, every time the parent component re-renders with a new `onMessage` function, the WebSocket would disconnect and reconnect.

**Exponential backoff.** The reconnection delay doubles with each attempt: 1 second, 2 seconds, 4 seconds, 8 seconds, 16 seconds. This prevents hammering the server with reconnection attempts if it is down. The delay is capped at 30 seconds.

**Clean close on unmount.** The cleanup function in `useEffect` calls `ws.close(1000, 'Component unmounted')`. Code 1000 means "normal closure." This prevents the reconnection logic from firing when the user navigates away.

**The `enabled` option.** This mirrors TanStack Query's `enabled` option. You can disable the WebSocket connection based on a condition (for example, only connect when the user is viewing a specific event).

---

## Defining WebSocket Message Types

Type safety matters for WebSocket messages. Define the message types your server sends:

```typescript
// src/types/ws.ts

interface RSVPMessage {
  type: 'rsvp';
  eventId: string;
  userId: string;
  userName: string;
  action: 'added' | 'removed';
  attendeeCount: number;
}

interface AttendeeCountMessage {
  type: 'attendee_count';
  eventId: string;
  count: number;
}

interface EventUpdateMessage {
  type: 'event_update';
  eventId: string;
  changes: Partial<GatherEvent>;
}

// Union type of all possible messages
export type WSMessage = RSVPMessage | AttendeeCountMessage | EventUpdateMessage;
```

Using a discriminated union (`type` field) lets TypeScript narrow the type inside a switch statement:

```typescript
function handleMessage(message: WSMessage) {
  switch (message.type) {
    case 'rsvp':
      // TypeScript knows message is RSVPMessage here
      console.log(`${message.userName} ${message.action} RSVP`);
      break;
    case 'attendee_count':
      // TypeScript knows message is AttendeeCountMessage here
      console.log(`Attendee count: ${message.count}`);
      break;
    case 'event_update':
      // TypeScript knows message is EventUpdateMessage here
      console.log(`Event updated:`, message.changes);
      break;
  }
}
```

---

## Integrating WebSocket Updates with TanStack Query

Here is where everything comes together. When a WebSocket message arrives, you update the TanStack Query cache directly. This means every component that reads from that cache re-renders with the new data automatically.

### Live Attendee Count

```tsx
// src/components/LiveAttendeeCount.tsx
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useEvent } from '@/hooks/useEvent';
import { eventKeys } from '@/lib/queryKeys';
import type { WSMessage } from '@/types/ws';
import type { GatherEvent } from '@/types/events';

interface LiveAttendeeCountProps {
  eventId: string;
}

export function LiveAttendeeCount({ eventId }: LiveAttendeeCountProps) {
  const queryClient = useQueryClient();
  const { data: event, isLoading } = useEvent(eventId);

  const { isConnected } = useWebSocket<WSMessage>({
    url: `wss://gather.example.com/ws/events/${eventId}`,
    onMessage: (message) => {
      if (message.type === 'attendee_count' && message.eventId === eventId) {
        // Update the cached event data with the new attendee count
        queryClient.setQueryData<GatherEvent>(
          eventKeys.detail(eventId),
          (oldData) => {
            if (!oldData) return oldData;
            return { ...oldData, attendeeCount: message.count };
          }
        );
      }
    },
    onOpen: () => {
      console.log(`Subscribed to live updates for event ${eventId}`);
    },
  });

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <p>
        {event?.attendeeCount ?? 0} attending
        {isConnected && <span aria-label="Live updates active"> (live)</span>}
      </p>
    </div>
  );
}
```

When a `attendee_count` message arrives, `setQueryData` updates the cache for `eventKeys.detail(eventId)`. Any component reading from that cache entry (the event detail page, the RSVP button, the attendee list) re-renders with the new count. You did not have to set up any subscriptions between components. The cache is the single source of truth, and TanStack Query handles the re-renders.

### Real-Time RSVP Feed

```tsx
// src/components/LiveRSVPFeed.tsx
'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/useWebSocket';
import { eventKeys } from '@/lib/queryKeys';
import type { WSMessage } from '@/types/ws';
import type { GatherEvent } from '@/types/events';

interface RSVPEntry {
  id: string;
  userName: string;
  action: 'added' | 'removed';
  timestamp: number;
}

export function LiveRSVPFeed({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient();
  const [feed, setFeed] = useState<RSVPEntry[]>([]);

  const { isConnected } = useWebSocket<WSMessage>({
    url: `wss://gather.example.com/ws/events/${eventId}`,
    onMessage: (message) => {
      if (message.type === 'rsvp' && message.eventId === eventId) {
        // Add to the local feed (UI state, not server state)
        const entry: RSVPEntry = {
          id: `${message.userId}-${Date.now()}`,
          userName: message.userName,
          action: message.action,
          timestamp: Date.now(),
        };
        setFeed((prev) => [entry, ...prev].slice(0, 50)); // Keep last 50

        // Also update the cached attendee count
        queryClient.setQueryData<GatherEvent>(
          eventKeys.detail(eventId),
          (oldData) => {
            if (!oldData) return oldData;
            return { ...oldData, attendeeCount: message.attendeeCount };
          }
        );
      }
    },
  });

  return (
    <div>
      <h3>
        Live RSVPs
        {isConnected ? (
          <span aria-label="Connected"> (connected)</span>
        ) : (
          <span aria-label="Reconnecting"> (reconnecting...)</span>
        )}
      </h3>
      {feed.length === 0 && <p>No RSVPs yet. Be the first!</p>}
      <ul>
        {feed.map((entry) => (
          <li key={entry.id}>
            <strong>{entry.userName}</strong>{' '}
            {entry.action === 'added' ? 'RSVPed' : 'cancelled RSVP'}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Notice the two different state strategies here. The RSVP feed entries are UI state, managed with `useState`, because they represent a local list of recent activity that does not come from an API query. The attendee count is server state, managed through TanStack Query's cache with `setQueryData`. Choosing the right state category for each piece of data (as you learned in Lesson 1) keeps the architecture clean.

---

## Reconnection with Exponential Backoff

The `useWebSocket` hook already includes reconnection logic, but understanding why exponential backoff matters is important.

Without backoff, a reconnection strategy might retry every second. If the server is down and 1,000 clients all reconnect every second, that is 1,000 reconnection attempts per second hitting the server the moment it comes back up. This "thundering herd" effect can immediately crash the server again.

Exponential backoff spaces out retries: 1s, 2s, 4s, 8s, 16s. Combined with jitter (adding a small random delay), this spreads reconnection attempts across time:

```typescript
const attemptReconnect = useCallback(() => {
  if (reconnectAttemptsRef.current >= maxReconnectAttempts) return;

  reconnectAttemptsRef.current += 1;

  // Exponential backoff with jitter
  const baseDelay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
  const jitter = Math.random() * 1000; // Random 0-1000ms
  const delay = baseDelay + jitter;

  reconnectTimeoutRef.current = setTimeout(() => {
    connect();
  }, delay);
}, [maxReconnectAttempts, connect]);
```

The jitter ensures that even if multiple clients use the same backoff schedule, their actual reconnection times are staggered.

---

## Cleanup: Why It Matters

WebSocket connections are resources. If you do not clean them up when a component unmounts, you get memory leaks and orphaned connections. The `useWebSocket` hook handles this in the `useEffect` cleanup:

```typescript
useEffect(() => {
  connect();

  return () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounted');
    }
  };
}, [connect]);
```

Three things happen on cleanup:

1. **Clear reconnection timers.** If a reconnection is scheduled, cancel it. Otherwise the timer fires after the component is gone and tries to update state on an unmounted component.
2. **Close the WebSocket with code 1000.** Code 1000 signals "normal closure." The `shouldReconnect` logic checks `event.wasClean` and skips reconnection for clean closes.
3. **The ref is reset implicitly.** When the component remounts, `connect()` creates a new WebSocket and assigns it to `wsRef.current`.

---

## When to Use WebSockets vs. Polling vs. SSE

| Feature | WebSockets | Polling (TanStack Query refetch) | Server-Sent Events (SSE) |
|---------|-----------|--------------------------------|--------------------------|
| Direction | Bidirectional | Client-to-server only | Server-to-client only |
| Latency | Near-instant | Depends on poll interval | Near-instant |
| Complexity | Higher (connection management) | Lower (just HTTP requests) | Moderate |
| Server support | Requires WebSocket server | Any HTTP server | Any HTTP server |
| Scalability | Requires connection management | Stateless, scales easily | Moderate |
| Best for | Chat, live feeds, collaboration | Data that changes every 10-60s | Notifications, live scores |

For Gather:
- **Live attendee count and RSVP feed**: WebSockets (changes in real-time, bidirectional subscription)
- **Event list on the main page**: TanStack Query with 30s staleTime (does not need to be instant)
- **Notification bell**: SSE or polling would both work (server-to-client only, moderate frequency)

---

## Key Takeaways

1. **WebSockets provide persistent, bidirectional connections** between client and server. They start as an HTTP request that upgrades to the WebSocket protocol.
2. **Build a reusable `useWebSocket` hook** that handles connection lifecycle, typed messages, reconnection, and cleanup. Store callbacks in refs to avoid unnecessary reconnections.
3. **Integrate WebSocket messages with TanStack Query** by calling `queryClient.setQueryData` when messages arrive. This updates every component that reads from that cache entry automatically.
4. **Use exponential backoff with jitter for reconnection.** This prevents thundering herd effects when the server recovers from downtime.
5. **Always clean up WebSocket connections on unmount.** Clear reconnection timers and close the connection with code 1000 to prevent memory leaks.
6. **WebSockets are not always the right choice.** For data that changes every 10-60 seconds, TanStack Query's background refetching is simpler and sufficient. Use WebSockets when you need sub-second updates.
7. **Use discriminated unions for WebSocket message types.** A `type` field lets TypeScript narrow the message type inside a switch statement, giving you full type safety on incoming messages.

---

## Try It Yourself

1. Build the `useWebSocket` hook from this lesson. To test without a real WebSocket server, use a free service like `wss://echo.websocket.org` or run a local server with the `ws` npm package.
2. Create a simple Node.js WebSocket server that sends a random attendee count every 2 seconds. Connect to it with your hook and display the count in a React component.
3. Add reconnection logic. Kill the server, observe the exponential backoff attempts in the console, restart the server, and verify the connection re-establishes automatically.
4. Integrate a WebSocket message with TanStack Query. When an `attendee_count` message arrives, use `setQueryData` to update the cached event. Verify that a separate component reading the same cache entry re-renders with the new count.
5. Build the `LiveRSVPFeed` component. Have your test server send mock RSVP messages and verify they appear in the feed in real-time.
6. Test cleanup by mounting and unmounting the component rapidly (navigate back and forth). Check the browser's Network tab to confirm that WebSocket connections are being closed cleanly and no orphaned connections remain.
7. Implement the `enabled` option. Pass `enabled={false}` to the hook and verify that no WebSocket connection is opened. Toggle it to `true` and verify the connection starts.
