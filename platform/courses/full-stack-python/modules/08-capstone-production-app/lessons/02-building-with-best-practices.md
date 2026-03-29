---
title: "Building with Best Practices"
estimatedMinutes: 75
---

# Building with Best Practices

You have your plan. Your ADR is written. Your vertical slices are mapped out. Now it is time to build. This lesson walks through implementing a feature across the full stack, applying best practices from every module in this course. We will use the waitlist system as the running example, but the patterns apply to whichever feature you chose. Adapt the specifics to your own capstone.

The goal here is not to follow instructions line by line. The goal is to see how a professional developer thinks through each layer of a feature, connecting the decisions you make in Django to the patterns you use in React, and the tests you write everywhere in between.

---

## Backend: Django Model and Migration

Start where the data lives. The `WaitlistEntry` model captures a user's place in line for a full event.

```python
# events/models.py
from django.conf import settings
from django.db import models


class WaitlistEntry(models.Model):
    class Status(models.TextChoices):
        WAITING = "waiting", "Waiting"
        PROMOTED = "promoted", "Promoted"
        EXPIRED = "expired", "Expired"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="waitlist_entries",
    )
    event = models.ForeignKey(
        "Event",
        on_delete=models.CASCADE,
        related_name="waitlist_entries",
    )
    position = models.PositiveIntegerField()
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.WAITING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    promoted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["position"]
        unique_together = [("user", "event")]
        indexes = [
            models.Index(fields=["event", "status", "position"]),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.event.title} (#{self.position})"
```

Notice several patterns from Module 06:

- **TextChoices enum** for the status field. This gives you type safety, readable labels, and automatic validation instead of raw strings.
- **`unique_together`** prevents a user from joining the same waitlist twice at the database level. Never rely on application code alone for uniqueness constraints.
- **Database index** on the fields you will query most frequently (finding waiting entries for an event, sorted by position). Without this index, the query scans the entire table.
- **`related_name`** values are explicit, so you can access `event.waitlist_entries.all()` without guessing what Django auto-generated.

Generate and apply the migration:

```bash
cd gather-backend
python manage.py makemigrations events
python manage.py migrate
```

---

## Backend: Serializer and ViewSet

The serializer defines what data goes over the wire. Keep it minimal. Clients do not need every field from the database.

```python
# events/serializers.py
from rest_framework import serializers
from .models import WaitlistEntry


class WaitlistEntrySerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = WaitlistEntry
        fields = ["id", "username", "position", "status", "created_at"]
        read_only_fields = ["id", "position", "status", "created_at"]
```

The `username` field uses `source` to reach into the related user object. This avoids sending the user's ID (which is meaningless to the frontend) and prevents the need for a separate API call to resolve usernames.

Now the ViewSet. This is where the business logic lives.

```python
# events/views.py
from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Event, WaitlistEntry
from .permissions import IsEventOrganizer
from .serializers import WaitlistEntrySerializer


class WaitlistViewSet(viewsets.GenericViewSet):
    serializer_class = WaitlistEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_event(self):
        return Event.objects.get(pk=self.kwargs["event_pk"])

    @action(detail=False, methods=["post"])
    def join(self, request, event_pk=None):
        event = self.get_event()

        # Check if the event is actually full
        if event.rsvps.filter(status="confirmed").count() < event.capacity:
            return Response(
                {"error": "Event is not full. RSVP instead."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if already on waitlist
        if WaitlistEntry.objects.filter(
            user=request.user, event=event, status=WaitlistEntry.Status.WAITING
        ).exists():
            return Response(
                {"error": "Already on waitlist."},
                status=status.HTTP_409_CONFLICT,
            )

        with transaction.atomic():
            # Get next position
            last_entry = (
                WaitlistEntry.objects.filter(event=event)
                .order_by("-position")
                .first()
            )
            next_position = (last_entry.position + 1) if last_entry else 1

            entry = WaitlistEntry.objects.create(
                user=request.user,
                event=event,
                position=next_position,
            )

        serializer = self.get_serializer(entry)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["delete"])
    def leave(self, request, event_pk=None):
        event = self.get_event()
        deleted_count, _ = WaitlistEntry.objects.filter(
            user=request.user,
            event=event,
            status=WaitlistEntry.Status.WAITING,
        ).delete()

        if deleted_count == 0:
            return Response(
                {"error": "Not on waitlist."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"])
    def list_entries(self, request, event_pk=None):
        """Only event organizers can see the full waitlist."""
        event = self.get_event()

        # Check organizer permission
        if event.organizer != request.user and not request.user.is_staff:
            return Response(status=status.HTTP_403_FORBIDDEN)

        entries = WaitlistEntry.objects.filter(
            event=event, status=WaitlistEntry.Status.WAITING
        )
        serializer = self.get_serializer(entries, many=True)
        return Response(serializer.data)
```

Key patterns to notice:

- **`transaction.atomic()`** around the position assignment. Without this, two users joining simultaneously could get the same position number. The atomic block ensures only one transaction reads and writes at a time.
- **Explicit error responses** with meaningful messages. Never return a bare 400 or 404 without telling the client what went wrong.
- **Permission checks inline** for the organizer-only endpoint. For a production app, you would extract this into a custom permission class (as you learned in M06), but the inline check shows the logic clearly.

Now add the promotion logic. This runs when an RSVP is cancelled:

```python
# events/services.py
import logging
from django.db import transaction
from django.utils import timezone
from .models import WaitlistEntry

logger = logging.getLogger("gather")


def promote_next_waitlist_entry(event):
    """Promote the next person on the waitlist when a spot opens."""
    with transaction.atomic():
        next_entry = (
            WaitlistEntry.objects
            .select_for_update()
            .filter(event=event, status=WaitlistEntry.Status.WAITING)
            .order_by("position")
            .first()
        )

        if next_entry is None:
            logger.info(
                "No waitlist entries to promote",
                extra={"event_id": event.id},
            )
            return None

        next_entry.status = WaitlistEntry.Status.PROMOTED
        next_entry.promoted_at = timezone.now()
        next_entry.save()

        # Create an RSVP for the promoted user
        event.rsvps.create(user=next_entry.user, status="confirmed")

        logger.info(
            "Waitlist entry promoted",
            extra={
                "event_id": event.id,
                "user_id": next_entry.user.id,
                "position": next_entry.position,
            },
        )

        return next_entry
```

The `select_for_update()` call is critical. It acquires a row-level database lock on the waitlist entry, preventing a race condition where two simultaneous RSVP cancellations promote the same person twice. This was the exact scenario your ADR should have addressed.

---

## Backend: Writing Python Tests

Test the business logic before touching the frontend. This is the most valuable place to invest testing time, because the promotion logic has real edge cases that are difficult to catch manually.

```python
# events/tests/test_waitlist.py
from django.test import TestCase
from django.contrib.auth import get_user_model
from events.models import Event, WaitlistEntry
from events.services import promote_next_waitlist_entry

User = get_user_model()


class WaitlistPromotionTests(TestCase):
    def setUp(self):
        self.organizer = User.objects.create_user(
            username="organizer", password="testpass123"
        )
        self.event = Event.objects.create(
            title="Brooklyn Tech Meetup",
            organizer=self.organizer,
            capacity=2,
        )

    def test_promotes_first_in_line(self):
        """The person with the lowest position number gets promoted."""
        user_a = User.objects.create_user(username="user_a", password="testpass123")
        user_b = User.objects.create_user(username="user_b", password="testpass123")

        WaitlistEntry.objects.create(user=user_a, event=self.event, position=1)
        WaitlistEntry.objects.create(user=user_b, event=self.event, position=2)

        promoted = promote_next_waitlist_entry(self.event)

        self.assertEqual(promoted.user, user_a)
        self.assertEqual(promoted.status, WaitlistEntry.Status.PROMOTED)
        self.assertIsNotNone(promoted.promoted_at)

    def test_creates_rsvp_on_promotion(self):
        """Promoting a waitlist entry also creates a confirmed RSVP."""
        user = User.objects.create_user(username="waiter", password="testpass123")
        WaitlistEntry.objects.create(user=user, event=self.event, position=1)

        promote_next_waitlist_entry(self.event)

        rsvp = self.event.rsvps.get(user=user)
        self.assertEqual(rsvp.status, "confirmed")

    def test_returns_none_when_waitlist_empty(self):
        """When no one is waiting, promotion returns None gracefully."""
        result = promote_next_waitlist_entry(self.event)
        self.assertIsNone(result)

    def test_skips_already_promoted_entries(self):
        """Only entries with 'waiting' status are eligible for promotion."""
        user_a = User.objects.create_user(username="user_a", password="testpass123")
        user_b = User.objects.create_user(username="user_b", password="testpass123")

        WaitlistEntry.objects.create(
            user=user_a, event=self.event, position=1,
            status=WaitlistEntry.Status.PROMOTED,
        )
        WaitlistEntry.objects.create(
            user=user_b, event=self.event, position=2,
        )

        promoted = promote_next_waitlist_entry(self.event)
        self.assertEqual(promoted.user, user_b)
```

Run the tests:

```bash
python manage.py test events.tests.test_waitlist -v 2
```

Four tests, each covering a distinct behavior. Notice that each test method has a docstring explaining the expected behavior in plain English. This is a habit that pays off when tests fail six months later and you need to understand what they were checking.

---

## Frontend: TypeScript Types

Now cross the stack boundary. Define TypeScript types that match the API response exactly. These types are the contract between your frontend and backend.

```typescript
// src/types/waitlist.ts
export interface WaitlistEntry {
  id: number;
  username: string;
  position: number;
  status: "waiting" | "promoted" | "expired";
  created_at: string;
}

export interface WaitlistJoinResponse {
  id: number;
  username: string;
  position: number;
  status: "waiting";
  created_at: string;
}

export interface WaitlistErrorResponse {
  error: string;
}
```

Using a union type for `status` instead of a plain `string` means TypeScript will catch any typo at compile time. If you accidentally write `"Waiting"` (capital W) anywhere in your frontend code, the compiler flags it immediately.

---

## Frontend: TanStack Query Hooks

Wrap all API calls in TanStack Query hooks. This gives you automatic caching, background refetching, loading states, error handling, and optimistic updates.

```typescript
// src/hooks/useWaitlist.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WaitlistEntry, WaitlistJoinResponse } from "@/types/waitlist";
import { api } from "@/lib/api";

export function useWaitlistPosition(eventId: number) {
  return useQuery<WaitlistEntry | null>({
    queryKey: ["waitlist", eventId, "position"],
    queryFn: async () => {
      const response = await api.get<WaitlistEntry[]>(
        `/events/${eventId}/waitlist/list_entries/`
      );
      const currentUser = api.getCurrentUsername();
      return response.data.find((entry) => entry.username === currentUser) ?? null;
    },
  });
}

export function useJoinWaitlist(eventId: number) {
  const queryClient = useQueryClient();

  return useMutation<WaitlistJoinResponse, Error>({
    mutationFn: async () => {
      const response = await api.post<WaitlistJoinResponse>(
        `/events/${eventId}/waitlist/join/`
      );
      return response.data;
    },

    // Optimistic update: show the user as joined immediately
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ["waitlist", eventId, "position"],
      });

      const previousPosition = queryClient.getQueryData<WaitlistEntry | null>([
        "waitlist",
        eventId,
        "position",
      ]);

      // Optimistically set a placeholder entry
      queryClient.setQueryData<WaitlistEntry>(
        ["waitlist", eventId, "position"],
        {
          id: -1,
          username: "",
          position: 0,
          status: "waiting",
          created_at: new Date().toISOString(),
        }
      );

      return { previousPosition };
    },

    onError: (_error, _variables, context) => {
      // Roll back to previous state on failure
      if (context?.previousPosition !== undefined) {
        queryClient.setQueryData(
          ["waitlist", eventId, "position"],
          context.previousPosition
        );
      }
    },

    onSettled: () => {
      // Refetch to get the real server data
      queryClient.invalidateQueries({
        queryKey: ["waitlist", eventId, "position"],
      });
      queryClient.invalidateQueries({
        queryKey: ["event", eventId],
      });
    },
  });
}

export function useLeaveWaitlist(eventId: number) {
  const queryClient = useQueryClient();

  return useMutation<void, Error>({
    mutationFn: async () => {
      await api.delete(`/events/${eventId}/waitlist/leave/`);
    },

    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ["waitlist", eventId, "position"],
      });

      const previousPosition = queryClient.getQueryData<WaitlistEntry | null>([
        "waitlist",
        eventId,
        "position",
      ]);

      queryClient.setQueryData(["waitlist", eventId, "position"], null);

      return { previousPosition };
    },

    onError: (_error, _variables, context) => {
      if (context?.previousPosition !== undefined) {
        queryClient.setQueryData(
          ["waitlist", eventId, "position"],
          context.previousPosition
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["waitlist", eventId, "position"],
      });
    },
  });
}
```

This is the optimistic update pattern from Module 03 in practice. When a user clicks "Join Waitlist," the UI updates instantly. If the server request fails (maybe the event filled up in the meantime), the UI rolls back to the previous state. The user never stares at a spinner wondering if their click registered.

---

## Frontend: React Component

Build the waitlist button as a composition of clear, testable pieces.

```tsx
// src/components/events/WaitlistButton.tsx
"use client";

import { useJoinWaitlist, useLeaveWaitlist, useWaitlistPosition } from "@/hooks/useWaitlist";

interface WaitlistButtonProps {
  eventId: number;
  isFull: boolean;
}

export function WaitlistButton({ eventId, isFull }: WaitlistButtonProps) {
  const { data: position, isLoading } = useWaitlistPosition(eventId);
  const joinMutation = useJoinWaitlist(eventId);
  const leaveMutation = useLeaveWaitlist(eventId);

  if (!isFull) return null;
  if (isLoading) return <WaitlistSkeleton />;

  const isOnWaitlist = position !== null && position !== undefined;

  if (isOnWaitlist) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-stone-600">
          You are #{position.position} on the waitlist
        </p>
        <button
          onClick={() => leaveMutation.mutate()}
          disabled={leaveMutation.isPending}
          className="px-4 py-2 text-sm border border-stone-300 rounded-lg
                     hover:bg-stone-50 transition-colors disabled:opacity-50"
          aria-label="Leave the waitlist for this event"
        >
          {leaveMutation.isPending ? "Leaving..." : "Leave Waitlist"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => joinMutation.mutate()}
      disabled={joinMutation.isPending}
      className="w-full px-6 py-3 bg-amber-700 text-white rounded-lg
                 hover:bg-amber-800 transition-colors disabled:opacity-50
                 font-medium"
      aria-label="Join the waitlist for this event"
    >
      {joinMutation.isPending ? "Joining..." : "Join Waitlist"}
    </button>
  );
}

function WaitlistSkeleton() {
  return (
    <div
      className="h-12 w-full bg-stone-200 rounded-lg animate-pulse"
      role="status"
      aria-label="Loading waitlist status"
    />
  );
}
```

Patterns from Module 02 at work here:

- **Composition over complexity.** The `WaitlistSkeleton` is a separate component rather than an inline conditional. This makes testing easier and keeps the main component readable.
- **Accessible by default.** Every interactive element has an `aria-label`. The skeleton uses `role="status"` so screen readers announce the loading state.
- **Disabled state during mutations.** The button is disabled while the request is in flight, preventing double-clicks.

---

## Frontend: Component Tests

Test the component in isolation using Vitest and React Testing Library.

```typescript
// src/components/events/__tests__/WaitlistButton.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WaitlistButton } from "../WaitlistButton";

// Mock the hooks
vi.mock("@/hooks/useWaitlist", () => ({
  useWaitlistPosition: vi.fn(),
  useJoinWaitlist: vi.fn(),
  useLeaveWaitlist: vi.fn(),
}));

import {
  useWaitlistPosition,
  useJoinWaitlist,
  useLeaveWaitlist,
} from "@/hooks/useWaitlist";

const mockedUseWaitlistPosition = vi.mocked(useWaitlistPosition);
const mockedUseJoinWaitlist = vi.mocked(useJoinWaitlist);
const mockedUseLeaveWaitlist = vi.mocked(useLeaveWaitlist);

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("WaitlistButton", () => {
  const defaultMutation = {
    mutate: vi.fn(),
    isPending: false,
  };

  beforeEach(() => {
    mockedUseJoinWaitlist.mockReturnValue(defaultMutation as any);
    mockedUseLeaveWaitlist.mockReturnValue(defaultMutation as any);
  });

  it("renders nothing when event is not full", () => {
    mockedUseWaitlistPosition.mockReturnValue({
      data: null,
      isLoading: false,
    } as any);

    const { container } = renderWithQuery(
      <WaitlistButton eventId={1} isFull={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("shows join button when event is full and user is not on waitlist", () => {
    mockedUseWaitlistPosition.mockReturnValue({
      data: null,
      isLoading: false,
    } as any);

    renderWithQuery(<WaitlistButton eventId={1} isFull={true} />);

    expect(
      screen.getByRole("button", { name: /join the waitlist/i })
    ).toBeInTheDocument();
  });

  it("shows position and leave button when user is on waitlist", () => {
    mockedUseWaitlistPosition.mockReturnValue({
      data: {
        id: 1,
        username: "testuser",
        position: 3,
        status: "waiting",
        created_at: "",
      },
      isLoading: false,
    } as any);

    renderWithQuery(<WaitlistButton eventId={1} isFull={true} />);

    expect(screen.getByText(/you are #3 on the waitlist/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /leave the waitlist/i })
    ).toBeInTheDocument();
  });

  it("calls join mutation when join button is clicked", async () => {
    const mutateFn = vi.fn();
    mockedUseWaitlistPosition.mockReturnValue({
      data: null,
      isLoading: false,
    } as any);
    mockedUseJoinWaitlist.mockReturnValue({
      mutate: mutateFn,
      isPending: false,
    } as any);

    renderWithQuery(<WaitlistButton eventId={1} isFull={true} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /join the waitlist/i }));

    expect(mutateFn).toHaveBeenCalledOnce();
  });

  it("shows loading skeleton while data is loading", () => {
    mockedUseWaitlistPosition.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    renderWithQuery(<WaitlistButton eventId={1} isFull={true} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
```

Five tests, each verifying a specific user-facing behavior. Notice that the tests describe what the user sees and does, not implementation details. The test says "shows join button when event is full" rather than "renders a button element with class bg-amber-700." If you change the styling, the test still passes. If you change the behavior, the test correctly fails.

---

## Code Review Checklist

Before you open a pull request, run through this checklist for every file you changed:

**TypeScript:**
- [ ] Zero uses of `any` (use `unknown` and narrow, or define proper types)
- [ ] All function parameters and return types are typed
- [ ] No type assertions (`as`) unless you have added a comment explaining why

**React:**
- [ ] Components have clear, descriptive names
- [ ] Props interfaces are defined (not inline)
- [ ] Loading, error, and empty states are all handled
- [ ] Interactive elements have `aria-label` or visible label text
- [ ] No direct DOM manipulation (use refs when needed)

**State Management:**
- [ ] API data uses TanStack Query (not `useState` + `useEffect`)
- [ ] Optimistic updates roll back on error
- [ ] Query keys are consistent and specific

**Django:**
- [ ] Models use appropriate field types and constraints
- [ ] Serializers expose only necessary fields
- [ ] ViewSet actions check permissions explicitly
- [ ] Business logic lives in service functions, not views
- [ ] Database operations use transactions where needed

**Testing:**
- [ ] Happy path is tested
- [ ] At least one edge case is tested
- [ ] Error states are tested
- [ ] Tests have descriptive names and docstrings
- [ ] No test depends on another test's state

**General:**
- [ ] No hardcoded URLs, IDs, or credentials
- [ ] Error messages are user-friendly
- [ ] Console has no warnings or errors
- [ ] The feature works on mobile screen sizes

Print this checklist or keep it open in a second tab while you work. It will catch the majority of issues before a reviewer ever sees your code.

---

## Key Takeaways

1. Start with the database model and work upward. The data shape determines everything above it: serializer fields, TypeScript types, component props.
2. Use `transaction.atomic()` and `select_for_update()` for any operation where concurrent requests could create inconsistent data.
3. TypeScript types for API responses are the contract between frontend and backend. When the contract is explicit, mismatches become compile-time errors instead of runtime bugs.
4. Optimistic updates with TanStack Query follow a predictable pattern: cancel in-flight queries, save previous state, set optimistic state, roll back on error, refetch on settle.
5. Component tests should verify user-visible behavior, not implementation details. If you can rephrase your test as "the user sees X when Y happens," it is testing the right thing.
6. A code review checklist catches routine issues before they reach a reviewer, letting the review focus on design decisions and logic instead of style nitpicks.
7. Business logic belongs in service functions (like `promote_next_waitlist_entry`), not in views or components. Services are easier to test and reuse.

## Try It Yourself

Build the first vertical slice of your chosen feature. Start with the Django model and migration, write the serializer and one ViewSet action, define the TypeScript types, create one TanStack Query hook, and build one React component that calls it. Write at least two Django tests and two component tests. Push the slice to your feature branch with a meaningful commit message. This single slice should be a working (if incomplete) feature that you could demo to someone.
