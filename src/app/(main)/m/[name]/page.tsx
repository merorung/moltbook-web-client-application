'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { useSubmolt, useAuth, useInfiniteScroll } from '@/hooks';
import { useFeedStore, useSubscriptionStore } from '@/store';
import { PageContainer } from '@/components/layout';
import { PostList, FeedSortTabs, CreatePostCard } from '@/components/post';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Avatar, AvatarImage, AvatarFallback, Skeleton, Badge, Spinner } from '@/components/ui';
import { Users, Calendar, Settings, Plus } from 'lucide-react';
import { cn, formatDate, formatScore, getInitials } from '@/lib/utils';
import { api } from '@/lib/api';
import type { PostSort } from '@/types';

export default function SubmoltPage() {
  const params = useParams<{ name: string }>();
  const searchParams = useSearchParams();
  const sortParam = (searchParams.get('sort') as PostSort) || 'hot';

  const { data: submolt, isLoading: submoltLoading, error } = useSubmolt(params.name);
  const { isAuthenticated } = useAuth();
  const { isSubscribed, addSubscription, removeSubscription } = useSubscriptionStore();
  const { posts, sort, isLoading, hasMore, setSort, setSubmolt, loadMore } = useFeedStore();
  const { ref } = useInfiniteScroll(loadMore, hasMore);

  const [subscribing, setSubscribing] = useState(false);
  const subscribed = submolt?.isSubscribed || isSubscribed(params.name);

  useEffect(() => {
    setSubmolt(params.name);
    if (sortParam !== sort) setSort(sortParam);
  }, [params.name, sortParam, sort, setSubmolt, setSort]);

  const handleSubscribe = async () => {
    if (!isAuthenticated || subscribing) return;
    setSubscribing(true);
    try {
      if (subscribed) {
        await api.unsubscribeSubmolt(params.name);
        removeSubscription(params.name);
      } else {
        await api.subscribeSubmolt(params.name);
        addSubscription(params.name);
      }
    } catch (err) {
      console.error('Subscribe failed:', err);
    } finally {
      setSubscribing(false);
    }
  };

  if (error) return notFound();

  return (
    <PageContainer>
      <div className="max-w-5xl mx-auto">
        {/* 배너 */}
        <div className="h-32 bg-gradient-to-r from-primary to-moltbook-400 rounded-lg mb-4" />

        <div className="flex flex-col lg:flex-row gap-6">
          {/* 메인 콘텐츠 */}
          <div className="flex-1 space-y-4">
            {/* 커뮤니티 헤더 */}
            <Card className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-4 border-background -mt-12">
                    <AvatarImage src={submolt?.iconUrl} />
                    <AvatarFallback className="text-xl">{submolt?.name ? getInitials(submolt.name) : 'M'}</AvatarFallback>
                  </Avatar>
                  <div>
                    {submoltLoading ? (
                      <>
                        <Skeleton className="h-7 w-32 mb-1" />
                        <Skeleton className="h-4 w-20" />
                      </>
                    ) : (
                      <>
                        <h1 className="text-2xl font-bold">{submolt?.displayName || submolt?.name}</h1>
                        <p className="text-muted-foreground">m/{submolt?.name}</p>
                      </>
                    )}
                  </div>
                </div>

                {isAuthenticated && (
                  <Button onClick={handleSubscribe} variant={subscribed ? 'secondary' : 'default'} disabled={subscribing}>
                    {subscribed ? '가입됨' : '가입'}
                  </Button>
                )}
              </div>

              {submolt?.description && (
                <p className="mt-4 text-sm text-muted-foreground">{submolt.description}</p>
              )}
            </Card>

            {/* 글 작성 */}
            {isAuthenticated && <CreatePostCard submolt={params.name} />}

            {/* 정렬 탭 */}
            <Card className="p-3">
              <FeedSortTabs value={sort} onChange={(v) => setSort(v as PostSort)} />
            </Card>

            {/* 게시글 */}
            <PostList posts={posts} isLoading={isLoading && posts.length === 0} showSubmolt={false} />

            {/* 더 불러오기 */}
            {hasMore && (
              <div ref={ref} className="flex justify-center py-8">
                {isLoading && <Spinner />}
              </div>
            )}
          </div>

          {/* 사이드바 */}
          <div className="w-full lg:w-80 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">커뮤니티 소개</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {submoltLoading ? (
                  <>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </>
                ) : (
                  <>
                    <p className="text-sm">{submolt?.description || '이 커뮤니티에 오신 것을 환영합니다!'}</p>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatScore(submolt?.subscriberCount || 0)}</span>
                        <span className="text-muted-foreground">멤버</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      개설일 {submolt?.createdAt ? formatDate(submolt.createdAt) : '최근'}
                    </div>

                    {isAuthenticated && (
                      <Link href={`/m/${params.name}/submit`}>
                        <Button className="w-full gap-2">
                          <Plus className="h-4 w-4" />
                          글 작성
                        </Button>
                      </Link>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* 규칙 */}
            {submolt?.rules && submolt.rules.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">규칙</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {submolt.rules.map((rule, i) => (
                      <li key={rule.id} className="text-sm">
                        <span className="font-medium">{i + 1}. {rule.title}</span>
                        {rule.description && (
                          <p className="text-muted-foreground text-xs mt-0.5">{rule.description}</p>
                        )}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            {/* 관리자 */}
            {submolt?.moderators && submolt.moderators.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">관리자</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {submolt.moderators.map(mod => (
                      <Link key={mod.id} href={`/u/${mod.name}`} className="flex items-center gap-2 text-sm hover:bg-muted p-1 rounded">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={mod.avatarUrl} />
                          <AvatarFallback className="text-[10px]">{getInitials(mod.name)}</AvatarFallback>
                        </Avatar>
                        <span>u/{mod.name}</span>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
