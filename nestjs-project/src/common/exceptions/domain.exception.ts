export abstract class DomainException extends Error {
  constructor(
    public readonly errorCode: string,
    public readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class EmailAlreadyExistsException extends DomainException {
  constructor() {
    super('EMAIL_ALREADY_EXISTS', 409, 'Email is already registered');
  }
}

export class InvalidCredentialsException extends DomainException {
  constructor() {
    super('INVALID_CREDENTIALS', 401, 'Invalid email or password');
  }
}

export class EmailNotConfirmedException extends DomainException {
  constructor() {
    super('EMAIL_NOT_CONFIRMED', 403, 'Email address has not been confirmed');
  }
}

export class InvalidTokenException extends DomainException {
  constructor() {
    super('INVALID_TOKEN', 401, 'Token is invalid');
  }
}

export class TokenExpiredException extends DomainException {
  constructor() {
    super('TOKEN_EXPIRED', 401, 'Token has expired');
  }
}

export class TokenReuseDetectedException extends DomainException {
  constructor() {
    super(
      'TOKEN_REUSE_DETECTED',
      401,
      'Token reuse detected — all sessions revoked',
    );
  }
}

export class ChannelNotFoundException extends DomainException {
  constructor() {
    super('CHANNEL_NOT_FOUND', 404, 'Channel not found');
  }
}

export class ChannelNotOwnedException extends DomainException {
  constructor() {
    super('CHANNEL_NOT_OWNED', 403, 'Channel does not belong to requester');
  }
}

export class VideoNotFoundException extends DomainException {
  constructor() {
    super('VIDEO_NOT_FOUND', 404, 'Video not found');
  }
}

export class VideoNotOwnedException extends DomainException {
  constructor() {
    super('VIDEO_NOT_OWNED', 403, 'Video does not belong to requester');
  }
}

export class InvalidVideoStateException extends DomainException {
  constructor(message = 'Video is not in a valid state for this operation') {
    super('INVALID_VIDEO_STATE', 409, message);
  }
}

export class FileSizeExceededException extends DomainException {
  constructor() {
    super('FILE_SIZE_EXCEEDED', 400, 'File size exceeds the 10GB limit');
  }
}

export class InvalidMultipartCompletionException extends DomainException {
  constructor(message = 'Multipart upload parts are empty or incomplete') {
    super('INVALID_MULTIPART_COMPLETION', 400, message);
  }
}

export class CategoryNotFoundException extends DomainException {
  constructor() {
    super('CATEGORY_NOT_FOUND', 404, 'Category not found');
  }
}

export class NicknameAlreadyExistsException extends DomainException {
  constructor() {
    super('NICKNAME_ALREADY_EXISTS', 409, 'Nickname is already in use');
  }
}

export class InvalidFileTypeException extends DomainException {
  constructor() {
    super('INVALID_FILE_TYPE', 400, 'Uploaded file is not an image');
  }
}

export class ThumbnailSizeExceededException extends DomainException {
  constructor() {
    super(
      'THUMBNAIL_SIZE_EXCEEDED',
      400,
      'Thumbnail file exceeds the configured size limit',
    );
  }
}
