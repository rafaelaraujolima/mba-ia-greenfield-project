import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Comment } from '../comments/entities/comment.entity';
import {
  CommentNotFoundException,
  VideoNotFoundException,
} from '../common/exceptions/domain.exception';
import {
  Video,
  VideoStatus,
  VideoVisibility,
} from '../videos/entities/video.entity';
import { CommentReaction } from './entities/comment-reaction.entity';
import { ReactionType } from './entities/reaction-type.enum';
import { VideoReaction } from './entities/video-reaction.entity';
import { ReactionsService } from './reactions.service';

describe('ReactionsService', () => {
  let service: ReactionsService;

  const videoReactionRepository = {
    upsert: jest.fn(),
    delete: jest.fn(),
    findOneBy: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const commentReactionRepository = {
    upsert: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const videoRepository = { findOne: jest.fn() };
  const commentRepository = { findOne: jest.fn() };

  const visibleVideo = {
    id: 'video-1',
    status: VideoStatus.READY,
    visibility: VideoVisibility.PUBLIC,
    published_at: new Date('2026-01-01T00:00:00Z'),
    channel: { user_id: 'owner-1' },
  };
  const hiddenVideo = {
    ...visibleVideo,
    status: VideoStatus.DRAFT,
    published_at: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ReactionsService,
        {
          provide: getRepositoryToken(VideoReaction),
          useValue: videoReactionRepository,
        },
        {
          provide: getRepositoryToken(CommentReaction),
          useValue: commentReactionRepository,
        },
        { provide: getRepositoryToken(Video), useValue: videoRepository },
        { provide: getRepositoryToken(Comment), useValue: commentRepository },
      ],
    }).compile();
    service = module.get(ReactionsService);
  });

  describe('video reactions', () => {
    it('should upsert by (user, video) when the video is visible', async () => {
      videoRepository.findOne.mockResolvedValue(visibleVideo);

      await service.setVideoReaction('viewer-1', 'video-1', ReactionType.LIKE);

      expect(videoReactionRepository.upsert).toHaveBeenCalledWith(
        { user_id: 'viewer-1', video_id: 'video-1', type: ReactionType.LIKE },
        ['user_id', 'video_id'],
      );
    });

    it('should throw VIDEO_NOT_FOUND and not write when the video does not exist', async () => {
      videoRepository.findOne.mockResolvedValue(null);

      await expect(
        service.setVideoReaction('viewer-1', 'ghost', ReactionType.LIKE),
      ).rejects.toThrow(VideoNotFoundException);
      expect(videoReactionRepository.upsert).not.toHaveBeenCalled();
    });

    it('should throw VIDEO_NOT_FOUND when the video is not visible to the user', async () => {
      videoRepository.findOne.mockResolvedValue(hiddenVideo);

      await expect(
        service.setVideoReaction('viewer-1', 'video-1', ReactionType.DISLIKE),
      ).rejects.toThrow(VideoNotFoundException);
      expect(videoReactionRepository.upsert).not.toHaveBeenCalled();
    });

    it('should let the owner react to a video that is not published', async () => {
      videoRepository.findOne.mockResolvedValue(hiddenVideo);

      await service.setVideoReaction('owner-1', 'video-1', ReactionType.LIKE);

      expect(videoReactionRepository.upsert).toHaveBeenCalled();
    });

    it('should delete by (user, video) without failing when none exists', async () => {
      videoRepository.findOne.mockResolvedValue(visibleVideo);
      videoReactionRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(
        service.removeVideoReaction('viewer-1', 'video-1'),
      ).resolves.toBeUndefined();
      expect(videoReactionRepository.delete).toHaveBeenCalledWith({
        user_id: 'viewer-1',
        video_id: 'video-1',
      });
    });
  });

  describe('comment reactions', () => {
    it('should upsert by (user, comment) when the comment video is visible', async () => {
      commentRepository.findOne.mockResolvedValue({
        id: 'comment-1',
        video: visibleVideo,
      });

      await service.setCommentReaction(
        'viewer-1',
        'comment-1',
        ReactionType.DISLIKE,
      );

      expect(commentReactionRepository.upsert).toHaveBeenCalledWith(
        {
          user_id: 'viewer-1',
          comment_id: 'comment-1',
          type: ReactionType.DISLIKE,
        },
        ['user_id', 'comment_id'],
      );
    });

    it('should throw COMMENT_NOT_FOUND when the comment does not exist', async () => {
      commentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.setCommentReaction('viewer-1', 'ghost', ReactionType.LIKE),
      ).rejects.toThrow(CommentNotFoundException);
      expect(commentReactionRepository.upsert).not.toHaveBeenCalled();
    });

    it('should throw COMMENT_NOT_FOUND when the comment video is not visible', async () => {
      commentRepository.findOne.mockResolvedValue({
        id: 'comment-1',
        video: hiddenVideo,
      });

      await expect(
        service.removeCommentReaction('viewer-1', 'comment-1'),
      ).rejects.toThrow(CommentNotFoundException);
      expect(commentReactionRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('batch lookups', () => {
    it('should return zeroed counts without querying for empty id lists', async () => {
      expect((await service.countVideoLikes([])).size).toBe(0);
      expect((await service.countCommentLikes([])).size).toBe(0);
      expect(videoReactionRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(
        commentReactionRepository.createQueryBuilder,
      ).not.toHaveBeenCalled();
    });

    it('should return an empty map without querying when no comment ids are given', async () => {
      const reactions = await service.findCommentReactions('viewer-1', []);

      expect(reactions.size).toBe(0);
      expect(commentReactionRepository.find).not.toHaveBeenCalled();
    });

    it('should resolve a missing video reaction to null', async () => {
      videoReactionRepository.findOneBy.mockResolvedValue(null);

      expect(await service.findVideoReaction('viewer-1', 'video-1')).toBeNull();
    });
  });
});
