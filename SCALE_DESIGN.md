# Step 10: Poll List Scale Response - Design Document

## 1. Current State Analysis

### Data Flow
```
/polls page.tsx (Server Component)
  ↓ RPC: get_polls_with_user_status() - NO PARAMS
  ↓ Returns: ALL polls
  ↓
PollsClient.tsx (Client Component)
  ↓ Props: serverPolls[]
  ↓ Renders: ALL polls at once
```

### Problems
- **Performance**: Loads all polls simultaneously (will fail at 100+ polls)
- **UX**: No filtering, sorting, or search capabilities
- **Mobile**: Poor experience with long lists
- **State**: No URL params for shareable filtered views
- **Scalability**: Linear degradation as poll count grows

## 2. Architecture Decisions

### 2.1 Pagination Strategy: **Infinite Scroll**

**Rationale:**
- ✅ Mobile-first design (scroll is natural on touch devices)
- ✅ Modern UX pattern (similar to social media feeds)
- ✅ React Query has built-in `useInfiniteQuery` support
- ✅ No need for complex pagination UI
- ❌ Traditional pagination alternative (better for specific page access, SEO)

**Decision:** Use infinite scroll with fallback to "Load More" button (accessibility)

### 2.2 Database Strategy: **Offset-based Pagination**

**Rationale:**
- ✅ Simple to implement with existing RPC functions
- ✅ Works well with Supabase's `.range()` method
- ✅ No need for complex cursor logic
- ❌ Cursor-based alternative (better for real-time data, no duplicates)

**Decision:** Offset-based with `limit` and `offset` parameters

### 2.3 State Management: **React Query + URL Params**

**Rationale:**
- ✅ React Query manages server state, caching, refetching
- ✅ URL params enable shareable links (e.g., `/polls?sort=votes&status=active`)
- ✅ Next.js `useSearchParams` for URL state
- ✅ Optimistic updates for favorites/votes already implemented

**Decision:** React Query for data, URL params for filter/sort state

## 3. API Design

### 3.1 RPC Function Signature

```sql
-- New function: get_polls_paginated
CREATE OR REPLACE FUNCTION get_polls_paginated(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_order TEXT DEFAULT 'desc',
  p_filter_status TEXT DEFAULT 'all' -- 'all', 'active', 'closed'
)
RETURNS TABLE (
  id UUID,
  question TEXT,
  is_public BOOLEAN,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status TEXT,
  created_by UUID,
  is_featured BOOLEAN,
  featured_image_url TEXT,
  poll_options JSONB,
  has_voted BOOLEAN,
  is_favorited BOOLEAN,
  total_count BIGINT  -- Total count for pagination metadata
)
```

### 3.2 Service Layer Interface

```typescript
// src/lib/services/polls.ts

export interface GetPollsParams {
  limit?: number;          // Default: 20
  offset?: number;         // Default: 0
  sortBy?: 'created_at' | 'votes' | 'expires_at';
  sortOrder?: 'asc' | 'desc';
  filterStatus?: 'all' | 'active' | 'closed';
}

export interface PollsResponse {
  data: PollWithOptions[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasNextPage: boolean;
    nextOffset: number | null;
  };
}

export async function getPollsPaginated(
  params: GetPollsParams = {}
): Promise<{ data: PollsResponse | null; error: Error | null }>;
```

### 3.3 API Route

```typescript
// src/app/api/polls/route.ts
// GET /api/polls?limit=20&offset=0&sortBy=created_at&sortOrder=desc&filterStatus=all

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const params: GetPollsParams = {
    limit: parseInt(searchParams.get('limit') || '20'),
    offset: parseInt(searchParams.get('offset') || '0'),
    sortBy: searchParams.get('sortBy') as GetPollsParams['sortBy'] || 'created_at',
    sortOrder: searchParams.get('sortOrder') as GetPollsParams['sortOrder'] || 'desc',
    filterStatus: searchParams.get('filterStatus') as GetPollsParams['filterStatus'] || 'all',
  };

  const { data, error } = await getPollsPaginated(params);
  // ...
}
```

## 4. UI/UX Design

### 4.1 Component Architecture

```
/polls/page.tsx (Server Component)
  ↓ Initial data fetch (first 20 polls)
  ↓
PollsClient.tsx (Client Component)
  ├─ PollsFilterBar.tsx (Filter & Sort controls)
  ├─ PollList.tsx (Infinite scroll container)
  │   ├─ PollCard.tsx (x20 initially)
  │   └─ LoadMoreTrigger.tsx (IntersectionObserver)
  └─ PollListSkeleton.tsx (Loading state)
```

### 4.2 Filter Bar Features

**Filters:**
- Status: All / Active / Closed
- Sort by: Newest / Oldest / Most Votes
- (Future: Search by question text)

**UI Pattern:**
```
┌─────────────────────────────────────────────┐
│ [All ▾] [Sort: Newest ▾]          [Search] │
└─────────────────────────────────────────────┘
```

**Mobile:** Collapsible filter panel with bottom sheet

### 4.3 Infinite Scroll Behavior

**Desktop:**
- Load more when user scrolls to bottom 200px from end
- Show "Loading..." indicator at bottom

**Mobile:**
- Same behavior + "Pull to refresh" at top
- "Load More" button as fallback (accessibility)

**Accessibility:**
- Focus management: announce new items to screen readers
- Keyboard: "Load More" button always accessible

## 5. Implementation Phases

### Phase 1: Database Layer ✅
- [ ] Create `get_polls_paginated` RPC function in Supabase
- [ ] Add indexes on `created_at`, `expires_at` for sorting performance
- [ ] Test with SQL editor (100+ poll dataset)

### Phase 2: Service Layer ✅
- [ ] Add `GetPollsParams`, `PollsResponse` types
- [ ] Implement `getPollsPaginated()` function
- [ ] Update API route to accept query parameters
- [ ] Test API route with Postman/curl

### Phase 3: Client Components ✅
- [ ] Create `PollsFilterBar.tsx` component
- [ ] Implement URL param sync with `useSearchParams`
- [ ] Create `useInfinitePolls` hook with React Query
- [ ] Update `PollsClient.tsx` to use infinite scroll
- [ ] Add `LoadMoreTrigger.tsx` with IntersectionObserver

### Phase 4: Data Seeding & QA ✅
- [ ] Update `scripts/seed.ts` to generate 100+ polls
- [ ] Performance testing (lighthouse, network tab)
- [ ] Mobile UX validation (iOS Safari, Android Chrome)
- [ ] Accessibility audit (screen reader, keyboard nav)

### Phase 5: Documentation & Deployment ✅
- [ ] Update README.md with new features
- [ ] Update ROADMAP.md (mark Step 10 complete)
- [ ] Version bump to v0.5.0
- [ ] Git commit and deploy

## 6. Performance Targets

| Metric | Current | Target | Notes |
|--------|---------|--------|-------|
| Initial load (polls page) | ~2s (10 polls) | <1s (20 polls) | First contentful paint |
| Scroll to next page | N/A | <300ms | Network + render |
| Filter change | Full reload | <500ms | Client-side + API call |
| Bundle size increase | 0 | <20KB | React Query + new components |

## 7. Future Enhancements (Out of Scope)

- [ ] Search functionality (full-text search on questions)
- [ ] Advanced filters (by creator, date range, vote count)
- [ ] Cursor-based pagination for real-time updates
- [ ] Virtual scrolling for extremely large lists (1000+ polls)
- [ ] SSR with streamed pagination (React Server Components)

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Poor mobile UX with infinite scroll | High | Add "Load More" button fallback |
| Cache invalidation complexity | Medium | Use React Query's built-in cache tags |
| RPC function performance with large offset | Medium | Add database indexes, limit max offset to 1000 |
| URL param sync breaking browser back button | High | Use Next.js shallow routing, test thoroughly |

## 9. Success Criteria

- [x] **Data Analysis**: Current flow documented, bottlenecks identified
- [ ] **API Implementation**: RPC + service layer supports pagination/filtering
- [ ] **UI Implementation**: Infinite scroll works on mobile + desktop
- [ ] **Performance**: Page load <1s, filter change <500ms
- [ ] **Accessibility**: WCAG 2.1 AA compliance
- [ ] **QA**: Manual testing with 100+ polls, no regressions

## 10. Testing Checklist

### Unit Tests
- [ ] `getPollsPaginated()` returns correct pagination metadata
- [ ] URL param parsing handles edge cases (invalid values, missing params)

### Integration Tests
- [ ] API route returns 20 polls by default
- [ ] Filter by status returns only active/closed polls
- [ ] Sort order changes reflected in results

### E2E Tests (Manual)
- [ ] Infinite scroll loads next page when scrolling to bottom
- [ ] Filter change resets scroll position and loads new results
- [ ] URL params update when filter/sort changes
- [ ] Browser back button restores previous filter state
- [ ] Mobile: Pull-to-refresh works
- [ ] Accessibility: Screen reader announces new items

---

**Document Status**: ✅ Complete - Ready for implementation
**Author**: Claude Code
**Date**: 2025-10-18
**Version**: 1.0
