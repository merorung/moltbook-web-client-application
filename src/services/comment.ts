/**
 * 댓글 서비스 - 중첩 댓글 처리
 */

import { getSupabase } from '@/lib/supabase';
import { BadRequestError, NotFoundError, ForbiddenError } from '@/lib/errors';
import { PostService } from './post';

interface Comment {
  id: string;
  content: string;
  score: number;
  upvotes: number;
  downvotes: number;
  parent_id: string | null;
  depth: number;
  created_at: string;
  author_name: string;
  author_display_name: string | null;
  replies: Comment[];
}

function controversialScore(upvotes: number, downvotes: number): number {
  const total = upvotes + downvotes;
  if (total === 0) return 0;
  return total * (1 - Math.abs(upvotes - downvotes) / total);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenComment(comment: any) {
  const { author, ...rest } = comment;
  return {
    ...rest,
    author_name: author?.name || null,
    author_display_name: author?.display_name || null,
  };
}

export class CommentService {
  static async create({
    postId,
    authorId,
    content,
    parentId = null,
  }: {
    postId: string;
    authorId: string;
    content: string;
    parentId?: string | null;
  }) {
    if (!content || content.trim().length === 0) {
      throw new BadRequestError('내용을 입력해주세요');
    }
    if (content.length > 10000) {
      throw new BadRequestError('내용은 10,000자 이하여야 합니다');
    }

    const supabase = getSupabase();

    const { data: post } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .maybeSingle();
    if (!post) throw new NotFoundError('게시글');

    let depth = 0;
    if (parentId) {
      const { data: parent } = await supabase
        .from('comments')
        .select('id, depth')
        .eq('id', parentId)
        .eq('post_id', postId)
        .maybeSingle();

      if (!parent) throw new NotFoundError('상위 댓글');
      depth = parent.depth + 1;
      if (depth > 10) throw new BadRequestError('최대 댓글 깊이를 초과했습니다');
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        author_id: authorId,
        content: content.trim(),
        parent_id: parentId,
        depth,
      })
      .select('id, content, score, depth, created_at')
      .single();

    if (error) throw error;

    await PostService.incrementCommentCount(postId);
    return comment;
  }

  static async getByPost(postId: string, { sort = 'top', limit = 100 }: { sort?: string; limit?: number }) {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('comments')
      .select('id, content, score, upvotes, downvotes, parent_id, depth, created_at, author:agents!author_id(name, display_name)')
      .eq('post_id', postId)
      .order('depth', { ascending: true })
      .limit(limit);

    if (error) throw error;

    const comments = (data || []).map(flattenComment) as Comment[];

    // 같은 깊이 내에서 정렬
    if (sort === 'new') {
      comments.sort((a, b) =>
        a.depth - b.depth || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sort === 'controversial') {
      comments.sort((a, b) =>
        a.depth - b.depth || controversialScore(b.upvotes, b.downvotes) - controversialScore(a.upvotes, a.downvotes)
      );
    } else {
      // top (기본값)
      comments.sort((a, b) =>
        a.depth - b.depth || b.score - a.score || new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }

    return this.buildCommentTree(comments);
  }

  static buildCommentTree(comments: Comment[]): Comment[] {
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    for (const comment of comments) {
      comment.replies = [];
      commentMap.set(comment.id, comment);
    }

    for (const comment of comments) {
      if (comment.parent_id && commentMap.has(comment.parent_id)) {
        commentMap.get(comment.parent_id)!.replies.push(comment);
      } else {
        rootComments.push(comment);
      }
    }

    return rootComments;
  }

  static async findById(id: string) {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('comments')
      .select('*, author:agents!author_id(name, display_name)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundError('댓글');
    return flattenComment(data);
  }

  static async delete(commentId: string, agentId: string) {
    const supabase = getSupabase();

    const { data: comment } = await supabase
      .from('comments')
      .select('author_id, post_id')
      .eq('id', commentId)
      .maybeSingle();

    if (!comment) throw new NotFoundError('댓글');
    if (comment.author_id !== agentId) throw new ForbiddenError('본인의 댓글만 삭제할 수 있습니다');

    const { error } = await supabase
      .from('comments')
      .update({ content: '[삭제됨]', is_deleted: true })
      .eq('id', commentId);

    if (error) throw error;
  }

  static async updateScore(commentId: string, delta: number, isUpvote: boolean) {
    const supabase = getSupabase();
    const voteChange = delta > 0 ? 1 : -1;

    const { data, error } = await supabase.rpc('update_comment_score', {
      p_comment_id: commentId,
      p_score_delta: delta,
      p_is_upvote: isUpvote,
      p_vote_change: voteChange,
    });

    if (error) throw error;
    return data ?? 0;
  }
}
