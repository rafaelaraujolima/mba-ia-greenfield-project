import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Channel } from '../channels/entities/channel.entity';
import {
  CommentDepthExceededException,
  CommentNotFoundException,
  VideoNotFoundException,
} from '../common/exceptions/domain.exception';
import { ReactionsService } from '../reactions/reactions.service';
import {
  Video,
  VideoStatus,
  VideoVisibility,
} from '../videos/entities/video.entity';
import { CommentsService } from './comments.service';
import { Comment } from './entities/comment.entity';

describe('CommentsService', () => {
  let service: CommentsService;

  const commentRepository = {
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((input: Partial<Comment>) => input),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
    countBy: jest.fn(),
  };
  const videoRepository = { findOne: jest.fn() };
  const channelRepository = { find: jest.fn() };
  const reactionsService = {
    countCommentLikes: jest.fn(),
    findCommentReactions: jest.fn(),
  };

  const visibleVideo = {
    id: 'video-1',
    status: VideoStatus.READY,
    visibility: VideoVisibility.PUBLIC,
    published_at: new Date('2026-01-01T00:00:00Z'),
    channel: { user_id: 'owner-1' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    channelRepository.find.mockResolvedValue([
      { user_id: 'viewer-1', name: 'Viewer', nickname: 'viewer' },
    ]);
    reactionsService.countCommentLikes.mockResolvedValue(new Map());
    reactionsService.findCommentReactions.mockResolvedValue(new Map());
    commentRepository.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    });

    const module = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: getRepositoryToken(Comment),
          useValue: commentRepository,
        },
        { provide: getRepositoryToken(Video), useValue: videoRepository },
        { provide: getRepositoryToken(Channel), useValue: channelRepository },
        { provide: ReactionsService, useValue: reactionsService },
      ],
    }).compile();
    service = module.get(CommentsService);
  });

  describe('create', () => {
    it('should throw VIDEO_NOT_FOUND when the video is missing or not visible', async () => {
      videoRepository.findOne.mockResolvedValue({
        ...visibleVideo,
        status: VideoStatus.DRAFT,
        published_at: null,
      });

      await expect(
        service.create('viewer-1', 'video-1', { body: 'hi' }),
      ).rejects.toThrow(VideoNotFoundException);
      expect(commentRepository.save).not.toHaveBeenCalled();
    });

    it('should throw COMMENT_NOT_FOUND when the parent does not exist', async () => {
      videoRepository.findOne.mockResolvedValue(visibleVideo);
      commentRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.create('viewer-1', 'video-1', {
          body: 'hi',
          parentId: 'parent-1',
        }),
      ).rejects.toThrow(CommentNotFoundException);
    });

    it('should throw COMMENT_NOT_FOUND when the parent belongs to another video', async () => {
      videoRepository.findOne.mockResolvedValue(visibleVideo);
      commentRepository.findOneBy.mockResolvedValue({
        id: 'parent-1',
        video_id: 'video-2',
        parent_id: null,
      });

      await expect(
        service.create('viewer-1', 'video-1', {
          body: 'hi',
          parentId: 'parent-1',
        }),
      ).rejects.toThrow(CommentNotFoundException);
    });

    it('should throw COMMENT_DEPTH_EXCEEDED when replying to a reply', async () => {
      videoRepository.findOne.mockResolvedValue(visibleVideo);
      commentRepository.findOneBy.mockResolvedValue({
        id: 'reply-1',
        video_id: 'video-1',
        parent_id: 'top-1',
      });

      await expect(
        service.create('viewer-1', 'video-1', {
          body: 'hi',
          parentId: 'reply-1',
        }),
      ).rejects.toThrow(CommentDepthExceededException);
      expect(commentRepository.save).not.toHaveBeenCalled();
    });

    it('should store the trimmed body as a top-level comment', async () => {
      videoRepository.findOne.mockResolvedValue(visibleVideo);
      commentRepository.save.mockImplementation((entity: Partial<Comment>) =>
        Promise.resolve({
          ...entity,
          id: 'comment-1',
          created_at: new Date('2026-02-01T00:00:00Z'),
        }),
      );

      const item = await service.create('viewer-1', 'video-1', {
        body: '  hello world  ',
      });

      expect(commentRepository.create).toHaveBeenCalledWith({
        video_id: 'video-1',
        user_id: 'viewer-1',
        parent_id: null,
        body: 'hello world',
      });
      expect(item.body).toBe('hello world');
      expect(item.parentId).toBeNull();
      expect(item.likeCount).toBe(0);
      expect(item.replyCount).toBe(0);
      expect(item.author.channelNickname).toBe('viewer');
    });
  });

  describe('listReplies', () => {
    it('should throw COMMENT_NOT_FOUND when the comment is itself a reply', async () => {
      commentRepository.findOne.mockResolvedValue({
        id: 'reply-1',
        parent_id: 'top-1',
        video: visibleVideo,
      });

      await expect(service.listReplies('reply-1', {})).rejects.toThrow(
        CommentNotFoundException,
      );
    });

    it('should throw COMMENT_NOT_FOUND when the comment video is not visible', async () => {
      commentRepository.findOne.mockResolvedValue({
        id: 'top-1',
        parent_id: null,
        video: {
          ...visibleVideo,
          status: VideoStatus.DRAFT,
          published_at: null,
        },
      });

      await expect(service.listReplies('top-1', {})).rejects.toThrow(
        CommentNotFoundException,
      );
    });
  });
});
