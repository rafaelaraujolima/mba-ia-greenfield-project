import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Channel } from '../channels/entities/channel.entity';
import {
  CommentDepthExceededException,
  CommentNotFoundException,
  VideoNotFoundException,
} from '../common/exceptions/domain.exception';
import { ReactionType } from '../reactions/entities/reaction-type.enum';
import { ReactionsService } from '../reactions/reactions.service';
import { Video } from '../videos/entities/video.entity';
import { isVideoVisibleTo } from '../videos/video-visibility.util';
import {
  decodeCommentCursor,
  encodeCommentCursor,
} from './comment-cursor.util';
import { DEFAULT_COMMENTS_LIMIT } from './comments.constants';
import { Comment } from './entities/comment.entity';

export interface CommentItem {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: Date;
  author: { channelName: string; channelNickname: string };
  likeCount: number;
  replyCount: number;
  viewerState: { reaction: ReactionType | null } | null;
}

export interface CommentsPage {
  items: CommentItem[];
  nextCursor: string | null;
}

export interface TopLevelCommentsPage extends CommentsPage {
  totalCount: number;
}

export interface CommentsPageQuery {
  cursor?: string;
  limit?: number;
}

export interface CreateCommentInput {
  body: string;
  parentId?: string;
}

type PageScope =
  | { kind: 'top-level'; videoId: string }
  | { kind: 'replies'; parentId: string };

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    private readonly reactionsService: ReactionsService,
  ) {}

  async create(
    userId: string,
    videoId: string,
    input: CreateCommentInput,
  ): Promise<CommentItem> {
    await this.assertVideoVisible(videoId, userId);

    if (input.parentId !== undefined) {
      const parent = await this.commentRepository.findOneBy({
        id: input.parentId,
      });
      if (!parent || parent.video_id !== videoId) {
        throw new CommentNotFoundException();
      }
      // Max depth 2 (social-interactions/TD-04): only top-level comments
      // accept replies.
      if (parent.parent_id !== null) {
        throw new CommentDepthExceededException();
      }
    }

    const saved = await this.commentRepository.save(
      this.commentRepository.create({
        video_id: videoId,
        user_id: userId,
        parent_id: input.parentId ?? null,
        // Plain text only (social-interactions/TD-09): stored trimmed, never
        // interpreted; escaping is the renderer's job.
        body: input.body.trim(),
      }),
    );

    const [item] = await this.toItems([saved], userId);
    return item;
  }

  async listTopLevel(
    videoId: string,
    { cursor, limit = DEFAULT_COMMENTS_LIMIT }: CommentsPageQuery,
    viewerId?: string,
  ): Promise<TopLevelCommentsPage> {
    await this.assertVideoVisible(videoId, viewerId);

    const page = await this.fetchPage(
      { kind: 'top-level', videoId },
      cursor,
      limit,
    );
    const items = await this.toItems(page.comments, viewerId);
    // Total includes replies (social-interactions/TD-02: COUNT on read).
    const totalCount = await this.commentRepository.countBy({
      video_id: videoId,
    });

    return { items, nextCursor: page.nextCursor, totalCount };
  }

  async listReplies(
    commentId: string,
    { cursor, limit = DEFAULT_COMMENTS_LIMIT }: CommentsPageQuery,
    viewerId?: string,
  ): Promise<CommentsPage> {
    const parent = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: { video: { channel: true } },
    });
    if (
      !parent ||
      parent.parent_id !== null ||
      !isVideoVisibleTo(parent.video, viewerId)
    ) {
      throw new CommentNotFoundException();
    }

    const page = await this.fetchPage(
      { kind: 'replies', parentId: commentId },
      cursor,
      limit,
    );
    const items = await this.toItems(page.comments, viewerId);

    return { items, nextCursor: page.nextCursor };
  }

  /** Comment totals per video (replies included), aggregated in batch. */
  async countByVideoIds(videoIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>(videoIds.map((id) => [id, 0]));
    if (videoIds.length === 0) return counts;

    const rows = await this.commentRepository
      .createQueryBuilder('comment')
      .select('comment.video_id', 'video_id')
      .addSelect('COUNT(*)', 'count')
      .where('comment.video_id IN (:...videoIds)', { videoIds })
      .groupBy('comment.video_id')
      .getRawMany<{ video_id: string; count: string }>();

    for (const row of rows) counts.set(row.video_id, Number(row.count));
    return counts;
  }

  /**
   * Keyset pagination over `(created_at DESC, id DESC)`; fetches one extra row
   * to know whether another page exists without a separate COUNT.
   */
  private async fetchPage(
    scope: PageScope,
    cursor: string | undefined,
    limit: number,
  ): Promise<{ comments: Comment[]; nextCursor: string | null }> {
    const query = this.commentRepository
      .createQueryBuilder('comment')
      .orderBy('comment.created_at', 'DESC')
      .addOrderBy('comment.id', 'DESC')
      .take(limit + 1);

    if (scope.kind === 'top-level') {
      query
        .where('comment.video_id = :videoId', { videoId: scope.videoId })
        .andWhere('comment.parent_id IS NULL');
    } else {
      query.where('comment.parent_id = :parentId', {
        parentId: scope.parentId,
      });
    }

    if (cursor !== undefined) {
      const decoded = decodeCommentCursor(cursor);
      query.andWhere(
        '(comment.created_at, comment.id) < (:cursorCreatedAt, :cursorId)',
        { cursorCreatedAt: decoded.createdAt, cursorId: decoded.id },
      );
    }

    const rows = await query.getMany();
    const hasMore = rows.length > limit;
    const comments = hasMore ? rows.slice(0, limit) : rows;
    const last = comments[comments.length - 1];

    return {
      comments,
      nextCursor:
        hasMore && last
          ? encodeCommentCursor({ createdAt: last.created_at, id: last.id })
          : null,
    };
  }

  /** Aggregates author, like count, reply count and viewer state in batch. */
  private async toItems(
    comments: Comment[],
    viewerId?: string,
  ): Promise<CommentItem[]> {
    if (comments.length === 0) return [];

    const commentIds = comments.map((comment) => comment.id);
    const userIds = [...new Set(comments.map((comment) => comment.user_id))];

    const [channels, likeCounts, replyCounts, viewerReactions] =
      await Promise.all([
        this.channelRepository.find({ where: { user_id: In(userIds) } }),
        this.reactionsService.countCommentLikes(commentIds),
        this.countReplies(commentIds),
        viewerId !== undefined
          ? this.reactionsService.findCommentReactions(viewerId, commentIds)
          : Promise.resolve(null),
      ]);
    const channelByUser = new Map(
      channels.map((channel) => [channel.user_id, channel]),
    );

    return comments.map((comment) => {
      const channel = channelByUser.get(comment.user_id);
      return {
        id: comment.id,
        parentId: comment.parent_id,
        body: comment.body,
        createdAt: comment.created_at,
        author: {
          channelName: channel?.name ?? '',
          channelNickname: channel?.nickname ?? '',
        },
        likeCount: likeCounts.get(comment.id) ?? 0,
        replyCount: replyCounts.get(comment.id) ?? 0,
        viewerState: viewerReactions
          ? { reaction: viewerReactions.get(comment.id) ?? null }
          : null,
      };
    });
  }

  private async countReplies(
    commentIds: string[],
  ): Promise<Map<string, number>> {
    const rows = await this.commentRepository
      .createQueryBuilder('comment')
      .select('comment.parent_id', 'parent_id')
      .addSelect('COUNT(*)', 'count')
      .where('comment.parent_id IN (:...commentIds)', { commentIds })
      .groupBy('comment.parent_id')
      .getRawMany<{ parent_id: string; count: string }>();

    return new Map(rows.map((row) => [row.parent_id, Number(row.count)]));
  }

  private async assertVideoVisible(
    videoId: string,
    userId?: string,
  ): Promise<void> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
      relations: { channel: true },
    });
    if (!video || !isVideoVisibleTo(video, userId)) {
      throw new VideoNotFoundException();
    }
  }
}
