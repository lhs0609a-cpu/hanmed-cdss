import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { SajuSectionType } from '../../../database/entities/saju-report-section.entity';

@Injectable()
export class SajuImageService {
  private readonly logger = new Logger(SajuImageService.name);
  private readonly openai: OpenAI | null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get('OPENAI_API_KEY');
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
  }

  /** 섹션별 DALL-E 일러스트 생성 */
  async generateSectionImage(
    sectionType: SajuSectionType,
    dominantElement: string,
  ): Promise<{ url: string; prompt: string } | null> {
    if (!this.openai) {
      this.logger.warn('OpenAI API key not configured, skipping image generation');
      return null;
    }

    const prompt = this.buildImagePrompt(sectionType, dominantElement);

    try {
      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        style: 'vivid',
      });

      const imageUrl = response.data[0]?.url;
      if (!imageUrl) return null;

      return { url: imageUrl, prompt };
    } catch (error) {
      this.logger.error(`DALL-E 이미지 생성 실패 [${sectionType}]`, error);
      return null;
    }
  }

  private buildImagePrompt(
    sectionType: SajuSectionType,
    dominantElement: string,
  ): string {
    const elementColors: Record<string, string> = {
      목: 'emerald green and spring colors',
      화: 'crimson red and warm orange',
      토: 'golden yellow and earthy brown',
      금: 'silver white and metallic',
      수: 'deep blue and midnight black',
    };

    const colorScheme = elementColors[dominantElement] || 'soft pastel colors';

    const sectionThemes: Record<SajuSectionType, string> = {
      [SajuSectionType.OVERVIEW]:
        'An elegant East Asian watercolor painting of the cosmos with five elements (wood, fire, earth, metal, water) swirling in harmony, celestial patterns, traditional Korean decorative motifs',
      [SajuSectionType.PERSONALITY]:
        'A serene watercolor portrait silhouette filled with flowing elements representing personality traits, East Asian brush painting style, bamboo and cherry blossoms',
      [SajuSectionType.HEALTH_CONSTITUTION]:
        'A beautiful watercolor illustration of the five organ system in traditional Korean medicine, with flowing energy meridians, healing herbs, and natural elements',
      [SajuSectionType.CAREER_WEALTH]:
        'An elegant East Asian watercolor of a golden dragon amidst clouds symbolizing prosperity, with traditional coins and bamboo, auspicious symbols',
      [SajuSectionType.RELATIONSHIPS]:
        'A romantic East Asian watercolor of two koi fish swimming together in harmony, lotus flowers, moonlight reflected on water',
      [SajuSectionType.YEARLY_FORTUNE]:
        'A majestic East Asian watercolor landscape showing the four seasons transitioning, mountains, flowing river, cherry blossoms to autumn leaves',
      [SajuSectionType.MONTHLY_FORTUNE]:
        'An elegant East Asian watercolor calendar wheel with twelve moons and seasonal symbols, circular composition, traditional Korean design',
      [SajuSectionType.LIFE_ADVICE]:
        'A wise sage meditating under an ancient tree in East Asian watercolor style, mountain landscape, flowing energy, peaceful atmosphere',
    };

    const theme = sectionThemes[sectionType];

    return `${theme}. Color palette: ${colorScheme}. Style: Traditional Korean oriental watercolor painting (동양화), soft brush strokes, no text or letters, no human faces, artistic and meditative, high quality illustration.`;
  }
}
