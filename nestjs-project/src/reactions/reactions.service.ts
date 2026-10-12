import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Comment } from '../comments/entities/comment.entity';
import {
  CommentNotFoundException,
  VideoNotFoundException,
} from '../common/exceptions/domain.exception';
import { Video } from '../videos/entities/video.entity';
import { isVideoVisibleTo } from '../videos/video-visibility.util';
import { CommentReaction } from './entities/comment-reaction.entity';
import { ReactionType } from './entities/reaction-type.enum';
import { VideoReaction } from './entities/video-reaction.entity';

@Injectable()
export class ReactionsService {
  constructor(
    @InjectRepository(VideoReaction)
    private readonly videoReactionRepository: Repository<VideoReaction>,
    @InjectRepository(CommentReaction)
    private readonly commentReactionRepository: Repository<CommentReaction>,
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
  ) {}

  /**
   * Idempotent upsert (social-interactions/TD-03): one reaction per
   * (user, video); a different `type` replaces the existing one.
   */
  async setVideoReaction(
    userId: string,
    videoId: string,
    type: ReactionType,
  ): Promise<void> {
    await this.assertVideoVisible(videoId, userId);
    await this.videoReactionRepository.upsert(
      { user_id: userId, video_id: videoId, type },
      ['user_id', 'video_id'],
    );
  }

  async removeVideoReaction(userId: string, videoId: string): Promise<void> {
    await this.assertVideoVisible(videoId, userId);
    await this.videoReactionRepository.delete({
      user_id: userId,
      video_id: videoId,
    });
  }

  async setCommentReaction(
    userId: string,
    commentId: string,
    type: ReactionType,
  ): Promise<void> {
    await this.assertCommentVisible(commentId, userId);
    await this.commentReactionRepository.upsert(
      { user_id: userId, comment_id: commentId, type },
      ['user_id', 'comment_id'],
    );
  }

  async removeCommentReaction(
    userId: string,
    commentId: string,
  ): Promise<void> {
    await this.assertCommentVisible(commentId, userId);
    await this.commentReactionRepository.delete({
      user_id: userId,
      comment_id: commentId,
    });
  }

  /** Like counts aggregated on read, in batch (social-interactions/TD-02). */
  async countVideoLikes(videoIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>(videoIds.map((id) => [id, 0]));
    if (videoIds.length === 0) return counts;

    const rows = await this.videoReactionRepository
      .createQueryBuilder('reaction')
      .select('reaction.video_id', 'target_id')
      .addSelect('COUNT(*)', 'count')
      .where('reaction.video_id IN (:...videoIds)', { videoIds })
      .andWhere('reaction.type = :type', { type: ReactionType.LIKE })
      .groupBy('reaction.video_id')
      .getRawMany<{ target_id: string; count: string }>();

    for (const row of rows) counts.set(row.target_id, Number(row.count));
    return counts;
  }

  async countCommentLikes(commentIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>(commentIds.map((id) => [id, 0]));
    if (commentIds.length === 0) return counts;

    const rows = await this.commentReactionRepository
      .createQueryBuilder('reaction')
      .select('reaction.comment_id', 'target_id')
      .addSelect('COUNT(*)', 'count')
      .where('reaction.comment_id IN (:...commentIds)', { commentIds })
      .andWhere('reaction.type = :type', { type: ReactionType.LIKE })
      .groupBy('reaction.comment_id')
      .getRawMany<{ target_id: string; count: string }>();

    for (const row of rows) counts.set(row.target_id, Number(row.count));
    return counts;
  }

  async findVideoReaction(
    userId: string,
    videoId: string,
  ): Promise<ReactionType | null> {
    const reaction = await this.videoReactionRepository.findOneBy({
      user_id: userId,
      video_id: videoId,
    });
    return reaction?.type ?? null;
  }

  async findCommentReactions(
    userId: string,
    commentIds: string[],
  ): Promise<Map<string, ReactionType>> {
    if (commentIds.length === 0) return new Map();

    const reactions = await this.commentReactionRepository.find({
      where: { user_id: userId, comment_id: In(commentIds) },
    });
    return new Map(
      reactions.map((reaction) => [reaction.comment_id, reaction.type]),
    );
  }

  private async assertVideoVisible(
    videoId: string,
    userId: string,
  ): Promise<void> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
      relations: { channel: true },
    });
    if (!video || !isVideoVisibleTo(video, userId)) {
      throw new VideoNotFoundException();
    }
  }

  private async assertCommentVisible(
    commentId: string,
    userId: string,
  ): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: { video: { channel: true } },
    });
    if (!comment || !isVideoVisibleTo(comment.video, userId)) {
      throw new CommentNotFoundException();
    }
  }
}
