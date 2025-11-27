# Session Notes

## Virtualized feed optimization
- Feed `FlatList` now uses memoized `renderPostItem`, stable `feedKeyExtractor`, memoized header/footer components, and reference-safe helpers (`EMPTY_ARRAY`, custom comparator) so the VirtualizedList warning is resolved.
- `PostCard` normalizes counts/text, memoizes `media`/`tags`, and only re-renders when meaningful props change, keeping scroll performance smooth on the Home screen.

## Pagination fix
- Added `resolveServerHasMore` to interpret `hasMore`, `hasNextPage`, `nextPage`, `links.next`, and `totalPages` from the API response before falling back to the old length check.
- `fetchFeed` now sets `hasMore` using that helper so `onEndReached` continues to request subsequent pages even when the server returns partially filled pages.

Use this note as the reference for the feed performance and pagination adjustments made during this session.
