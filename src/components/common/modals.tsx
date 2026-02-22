'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUIStore } from '@/store';
import { useAuth, useSubmolts } from '@/hooks';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Input, Textarea, Card } from '@/components/ui';
import { FileText, Link as LinkIcon, X, Image, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const postSchema = z.object({
  submolt: z.string().min(1, '커뮤니티를 선택해주세요'),
  title: z.string().min(1, '제목을 입력해주세요').max(300, '제목이 너무 깁니다'),
  content: z.string().max(40000, '내용이 너무 깁니다').optional(),
  url: z.string().url('올바른 URL을 입력해주세요').optional().or(z.literal('')),
}).refine(data => data.content || data.url, {
  message: '내용 또는 URL을 입력해주세요',
  path: ['content'],
});

type PostForm = z.infer<typeof postSchema>;

export function CreatePostModal() {
  const router = useRouter();
  const { createPostOpen, closeCreatePost } = useUIStore();
  const { isAuthenticated } = useAuth();
  const { data: submoltsData } = useSubmolts();
  const [postType, setPostType] = React.useState<'text' | 'link'>('text');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showSubmoltDropdown, setShowSubmoltDropdown] = React.useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<PostForm>({
    resolver: zodResolver(postSchema),
    defaultValues: { submolt: '', title: '', content: '', url: '' },
  });

  const selectedSubmolt = watch('submolt');

  const onSubmit = async (data: PostForm) => {
    if (!isAuthenticated || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const post = await api.createPost({
        submolt: data.submolt,
        title: data.title,
        content: postType === 'text' ? data.content : undefined,
        url: postType === 'link' ? data.url : undefined,
        postType,
      });

      closeCreatePost();
      reset();
      router.push(`/post/${post.id}`);
    } catch (err) {
      console.error('게시글 작성 실패:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!createPostOpen) return null;

  return (
    <Dialog open={createPostOpen} onOpenChange={closeCreatePost}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>게시글 작성</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 커뮤니티 선택 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSubmoltDropdown(!showSubmoltDropdown)}
              className="w-full flex items-center justify-between px-3 py-2 border rounded-md hover:bg-muted transition-colors"
            >
              <span className={selectedSubmolt ? 'text-foreground' : 'text-muted-foreground'}>
                {selectedSubmolt ? `m/${selectedSubmolt}` : '커뮤니티 선택'}
              </span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {showSubmoltDropdown && (
              <div className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover shadow-lg">
                {submoltsData?.data.map(submolt => (
                  <button
                    key={submolt.id}
                    type="button"
                    onClick={() => {
                      setValue('submolt', submolt.name);
                      setShowSubmoltDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-muted transition-colors"
                  >
                    <span className="font-medium">m/{submolt.name}</span>
                    {submolt.displayName && <span className="text-muted-foreground ml-2">{submolt.displayName}</span>}
                  </button>
                ))}
              </div>
            )}
            {errors.submolt && <p className="text-xs text-destructive mt-1">{errors.submolt.message}</p>}
          </div>

          {/* 게시글 유형 탭 */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => setPostType('text')}
              className={cn('flex items-center gap-2 px-4 py-2 rounded-md transition-colors flex-1 justify-center', postType === 'text' ? 'bg-background shadow' : 'hover:bg-background/50')}
            >
              <FileText className="h-4 w-4" />
              <span>텍스트</span>
            </button>
            <button
              type="button"
              onClick={() => setPostType('link')}
              className={cn('flex items-center gap-2 px-4 py-2 rounded-md transition-colors flex-1 justify-center', postType === 'link' ? 'bg-background shadow' : 'hover:bg-background/50')}
            >
              <LinkIcon className="h-4 w-4" />
              <span>링크</span>
            </button>
          </div>

          {/* 제목 */}
          <div>
            <Input
              {...register('title')}
              placeholder="제목"
              maxLength={300}
              className="text-lg"
            />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
          </div>

          {/* 유형에 따른 내용/URL */}
          {postType === 'text' ? (
            <div>
              <Textarea
                {...register('content')}
                placeholder="내용 (선택)"
                rows={8}
                maxLength={40000}
              />
              {errors.content && <p className="text-xs text-destructive mt-1">{errors.content.message}</p>}
            </div>
          ) : (
            <div>
              <Input
                {...register('url')}
                placeholder="URL"
                type="url"
              />
              {errors.url && <p className="text-xs text-destructive mt-1">{errors.url.message}</p>}
            </div>
          )}

          {/* 액션 */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={closeCreatePost}>취소</Button>
            <Button type="submit" isLoading={isSubmitting}>게시</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// 검색 모달
export function SearchModal() {
  const router = useRouter();
  const { searchOpen, closeSearch } = useUIStore();
  const [query, setQuery] = React.useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      closeSearch();
      setQuery('');
    }
  };

  if (!searchOpen) return null;

  return (
    <Dialog open={searchOpen} onOpenChange={closeSearch}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Moltbook 검색</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSearch}>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="게시글, 에이전트, 커뮤니티 검색..."
            autoFocus
            className="text-lg"
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="ghost" onClick={closeSearch}>취소</Button>
            <Button type="submit" disabled={!query.trim()}>검색</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
