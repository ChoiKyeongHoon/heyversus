# Step 10: Pagination & Filtering - SQL Implementation

## Database Schema Requirements

This document contains SQL commands to enable pagination, filtering, and sorting for poll lists.

**Important**: Execute these SQL commands in the Supabase SQL Editor in order.

## 1. Create Paginated Polls RPC Function

This function extends `get_polls_with_user_status` with pagination and filtering support.

```sql
-- Drop existing function if needed (for updates)
DROP FUNCTION IF EXISTS get_polls_paginated(INTEGER, INTEGER, TEXT, TEXT, TEXT);

-- Create paginated polls function
CREATE OR REPLACE FUNCTION get_polls_paginated(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_order TEXT DEFAULT 'desc',
  p_filter_status TEXT DEFAULT 'all'
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
  total_count BIGINT
) AS $$
DECLARE
  total_polls BIGINT;
BEGIN
  -- Get total count for pagination metadata
  SELECT COUNT(*)
  INTO total_polls
  FROM polls p
  WHERE
    -- Public polls OR private polls created by current user
    (p.is_public = TRUE OR p.created_by = auth.uid())
    -- Apply status filter
    AND (
      p_filter_status = 'all' OR
      (p_filter_status = 'active' AND (p.status = 'active' OR (p.expires_at IS NULL OR p.expires_at > NOW()))) OR
      (p_filter_status = 'closed' AND (p.status = 'closed' OR (p.expires_at IS NOT NULL AND p.expires_at <= NOW())))
    );

  -- Return paginated results with total count
  RETURN QUERY
  SELECT
    p.id,
    p.question,
    p.is_public,
    p.created_at,
    p.expires_at,
    COALESCE(p.status, 'active') AS status,
    p.created_by,
    COALESCE(p.is_featured, FALSE) AS is_featured,
    p.featured_image_url,
    -- Aggregate poll options with votes
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', po.id,
            'text', po.text,
            'votes', COALESCE(po.votes, 0),
            'image_url', po.image_url,
            'created_at', po.created_at
          )
          ORDER BY po.created_at
        )
        FROM poll_options po
        WHERE po.poll_id = p.id
      ),
      '[]'::jsonb
    ) AS poll_options,
    -- Check if current user has voted
    EXISTS(
      SELECT 1
      FROM user_votes uv
      WHERE uv.poll_id = p.id
        AND uv.user_id = auth.uid()
    ) AS has_voted,
    -- Check if current user has favorited
    EXISTS(
      SELECT 1
      FROM favorite_polls fp
      WHERE fp.poll_id = p.id
        AND fp.user_id = auth.uid()
    ) AS is_favorited,
    -- Include total count in every row for pagination metadata
    total_polls AS total_count
  FROM polls p
  WHERE
    -- Public polls OR private polls created by current user
    (p.is_public = TRUE OR p.created_by = auth.uid())
    -- Apply status filter
    AND (
      p_filter_status = 'all' OR
      (p_filter_status = 'active' AND (p.status = 'active' OR (p.expires_at IS NULL OR p.expires_at > NOW()))) OR
      (p_filter_status = 'closed' AND (p.status = 'closed' OR (p.expires_at IS NOT NULL AND p.expires_at <= NOW())))
    )
  -- Apply sorting
  ORDER BY
    CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN p.created_at END DESC,
    CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN p.created_at END ASC,
    CASE WHEN p_sort_by = 'expires_at' AND p_sort_order = 'desc' THEN p.expires_at END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'expires_at' AND p_sort_order = 'asc' THEN p.expires_at END ASC NULLS LAST,
    -- For 'votes' sort, we need to calculate total votes per poll
    CASE WHEN p_sort_by = 'votes' AND p_sort_order = 'desc' THEN (
      SELECT COALESCE(SUM(po.votes), 0)
      FROM poll_options po
      WHERE po.poll_id = p.id
    ) END DESC,
    CASE WHEN p_sort_by = 'votes' AND p_sort_order = 'asc' THEN (
      SELECT COALESCE(SUM(po.votes), 0)
      FROM poll_options po
      WHERE po.poll_id = p.id
    ) END ASC
  -- Apply pagination
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_polls_paginated TO authenticated;
GRANT EXECUTE ON FUNCTION get_polls_paginated TO anon;
```

## 2. Add Performance Indexes

These indexes optimize sorting performance for the new RPC function.

```sql
-- Index for sorting by created_at (if not exists)
CREATE INDEX IF NOT EXISTS idx_polls_created_at ON polls(created_at DESC);

-- Index for sorting by expires_at (if not exists)
CREATE INDEX IF NOT EXISTS idx_polls_expires_at ON polls(expires_at DESC NULLS LAST);

-- Index for filtering by status (if not exists)
CREATE INDEX IF NOT EXISTS idx_polls_status ON polls(status);

-- Composite index for filtering by is_public and created_by (if not exists)
CREATE INDEX IF NOT EXISTS idx_polls_public_creator ON polls(is_public, created_by);

-- Index on poll_options for vote aggregation (if not exists)
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id_votes ON poll_options(poll_id, votes);
```

## 3. Test Queries

After creating the function, test it with these queries:

```sql
-- Test 1: Basic pagination (first page)
SELECT * FROM get_polls_paginated(20, 0, 'created_at', 'desc', 'all');

-- Test 2: Second page
SELECT * FROM get_polls_paginated(20, 20, 'created_at', 'desc', 'all');

-- Test 3: Filter by active polls only
SELECT * FROM get_polls_paginated(20, 0, 'created_at', 'desc', 'active');

-- Test 4: Filter by closed polls only
SELECT * FROM get_polls_paginated(20, 0, 'created_at', 'desc', 'closed');

-- Test 5: Sort by votes (descending)
SELECT * FROM get_polls_paginated(20, 0, 'votes', 'desc', 'all');

-- Test 6: Sort by expiry date (ascending)
SELECT * FROM get_polls_paginated(20, 0, 'expires_at', 'asc', 'all');

-- Test 7: Check total_count is consistent
SELECT DISTINCT total_count FROM get_polls_paginated(10, 0, 'created_at', 'desc', 'all');
```

## 4. Verify Performance

Check query performance with EXPLAIN ANALYZE:

```sql
EXPLAIN ANALYZE
SELECT * FROM get_polls_paginated(20, 0, 'created_at', 'desc', 'all');

-- Expected: Should use index scan on idx_polls_created_at
-- Execution time: < 50ms for 1000 polls
```

## 5. Rollback (if needed)

If you need to rollback these changes:

```sql
-- Drop the function
DROP FUNCTION IF EXISTS get_polls_paginated(INTEGER, INTEGER, TEXT, TEXT, TEXT);

-- Drop the indexes (only if you want to remove them)
DROP INDEX IF EXISTS idx_polls_created_at;
DROP INDEX IF EXISTS idx_polls_expires_at;
DROP INDEX IF EXISTS idx_polls_status;
DROP INDEX IF EXISTS idx_polls_public_creator;
DROP INDEX IF EXISTS idx_poll_options_poll_id_votes;
```

## Notes

1. **Security**: The function uses `SECURITY DEFINER` to run with elevated privileges, but still respects RLS by checking `auth.uid()`.

2. **Performance**: The total count is calculated once and included in every row. This is more efficient than a separate COUNT query, but less efficient than cursor-based pagination for very large datasets (10,000+ rows).

3. **Sorting by votes**: This requires aggregating votes on-the-fly, which is expensive. Consider adding a materialized `total_votes` column to the `polls` table for better performance if this becomes a bottleneck.

4. **Status filtering**: The function checks both the `status` column and the `expires_at` timestamp to determine if a poll is active or closed. This provides flexibility for manually closed polls vs auto-expired polls.

5. **Null handling**: `NULLS LAST` ensures polls without expiry dates appear at the end when sorting by `expires_at`.

## Migration Checklist

- [ ] Execute SQL in Supabase SQL Editor
- [ ] Verify indexes created successfully
- [ ] Run test queries
- [ ] Check performance with EXPLAIN ANALYZE
- [ ] Test with authenticated and anonymous users
- [ ] Verify RLS policies work correctly

---

**Status**: Ready for execution
**Prerequisites**: `polls`, `poll_options`, `user_votes`, `favorite_polls` tables must exist
**Execution time**: ~5 seconds
**Reversible**: Yes (see rollback section)
