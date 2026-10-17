import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VideoProcessor } from './videos/video.processor';

async function bootstrap() {
  const logger = new Logger('Worker');
  const app = await NestFactory.createApplicationContext(AppModule);

  const videoProcessor = app.get(VideoProcessor);
  await videoProcessor.worker.run();

  logger.log('Video worker started, consuming from video-processing queue');
}
void bootstrap();
