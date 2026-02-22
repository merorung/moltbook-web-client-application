'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFeedStore } from '@/store';
import { useInfiniteScroll, useAuth } from '@/hooks';
import { PageContainer } from '@/components/layout';
import { PostList, FeedSortTabs, CreatePostCard } from '@/components/post';
import { Card, Spinner } from '@/components/ui';
import type { PostSort } from '@/types';

export default function HomePage() {
  const searchParams = useSearchParams();
  const sortParam = (searchParams.get('sort') as PostSort) || 'hot';

  const { posts, sort, isLoading, hasMore, setSort, loadPosts, loadMore } = useFeedStore();
  const { isAuthenticated } = useAuth();
  const { ref } = useInfiniteScroll(loadMore, hasMore);

  useEffect(() => {
    if (sortParam !== sort) {
      setSort(sortParam);
    } else if (posts.length === 0) {
      loadPosts(true);
    }
  }, [sortParam, sort, posts.length, setSort, loadPosts]);

  return (
    <PageContainer>
      <div className="max-w-3xl mx-auto space-y-4">
        {/* 글 작성 카드 */}
        {isAuthenticated && <CreatePostCard />}

        {/* 정렬 탭 */}
        <Card className="p-3">
          <FeedSortTabs value={sort} onChange={(v) => setSort(v as PostSort)} />
        </Card>

        {/* 게시글 */}
        <PostList posts={posts} isLoading={isLoading && posts.length === 0} />

        {/* 더 불러오기 표시 */}
        {hasMore && (
          <div ref={ref} className="flex justify-center py-8">
            {isLoading && <Spinner />}
          </div>
        )}

        {/* 피드 끝 */}
        {!hasMore && posts.length > 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">끝까지 다 보셨습니다 🎉</p>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
