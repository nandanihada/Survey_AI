export interface ResponseQuality {
  score: number; // 0-100
  category: 'genuine' | 'low-effort' | 'spam' | 'gibberish';
  delay: number; // in milliseconds
  reason: string;
}

export class ResponseQualityAnalyzer {
  private static readonly SPAM_PATTERNS = [
    /(.)\1{4,}/g, // Repeated characters (aaaaa)
    /^[0-9]+$/g, // Only numbers
    /^[!@#$%^&*()]+$/g, // Only special characters
    /test|testing|asdf|qwer|zxcv|spam/i, // Common spam words
    /^.{1,2}$/g, // Too short responses
    /lorem|ipsum|dolor|sit|amet/i, // Lorem ipsum text
  ];

  private static readonly GIBBERISH_PATTERNS = [
    /^[bcdfghjklmnpqrstvwxyz]+$/i, // Only consonants
    /^[aeiou]+$/i, // Only vowels
    /(..).*\1.*\1/g, // Repeated patterns
    /^[a-z]{1}[a-z]{1}[a-z]{1}[a-z]{1}$/i, // Random 4 letter combinations
  ];

  private static readonly POSITIVE_INDICATORS = [
    'love', 'like', 'enjoy', 'great', 'awesome', 'good', 'excellent', 'amazing',
    'fantastic', 'wonderful', 'perfect', 'helpful', 'useful', 'easy', 'smooth',
    'intuitive', 'clean', 'modern', 'fast', 'efficient', 'reliable'
  ];

  private static readonly NEGATIVE_INDICATORS = [
    'hate', 'dislike', 'terrible', 'awful', 'bad', 'worst', 'horrible', 'slow',
    'confusing', 'difficult', 'broken', 'buggy', 'annoying', 'frustrating',
    'complicated', 'messy', 'ugly', 'outdated'
  ];

  private static readonly ENGAGEMENT_INDICATORS = [
    'because', 'however', 'specifically', 'particularly', 'especially', 'mainly',
    'definitely', 'probably', 'maybe', 'perhaps', 'would', 'could', 'should',
    'think', 'feel', 'believe', 'recommend', 'suggest', 'improve', 'better'
  ];

  static analyzeResponse(response: string, questionType: string, timeSpent: number = 0): ResponseQuality {
    const text = response.toLowerCase().trim();
    const words = text.split(/\s+/).filter(word => word.length > 0);
    let score = 50; // Base score
    let category: ResponseQuality['category'] = 'genuine';
    let reason = 'Standard response';

    // Check for spam patterns
    for (const pattern of this.SPAM_PATTERNS) {
      if (pattern.test(text)) {
        score -= 30;
        category = 'spam';
        reason = 'Detected spam pattern';
        break;
      }
    }

    // Check for gibberish patterns
    if (category !== 'spam') {
      for (const pattern of this.GIBBERISH_PATTERNS) {
        if (pattern.test(text)) {
          score -= 25;
          category = 'gibberish';
          reason = 'Appears to be gibberish';
          break;
        }
      }
    }

    // Length analysis
    if (text.length < 3) {
      score -= 20;
      if (category === 'genuine') {
        category = 'low-effort';
        reason = 'Response too short';
      }
    } else if (text.length > 10 && text.length < 100) {
      score += 10; // Good length
    } else if (text.length > 100) {
      score += 15; // Detailed response
    }

    // Word count analysis
    if (words.length === 1 && questionType !== 'emoji') {
      score -= 15;
      if (category === 'genuine') {
        category = 'low-effort';
        reason = 'Single word response';
      }
    } else if (words.length > 3) {
      score += 10; // Multi-word response
    }

    // Sentiment and engagement analysis
    const hasPositiveIndicators = this.POSITIVE_INDICATORS.some(indicator => 
      text.includes(indicator)
    );
    const hasNegativeIndicators = this.NEGATIVE_INDICATORS.some(indicator => 
      text.includes(indicator)
    );
    const hasEngagementIndicators = this.ENGAGEMENT_INDICATORS.some(indicator => 
      text.includes(indicator)
    );

    if (hasPositiveIndicators || hasNegativeIndicators) {
      score += 15; // Shows sentiment
      if (category === 'genuine') {
        reason = 'Shows clear sentiment';
      }
    }

    if (hasEngagementIndicators) {
      score += 20; // Shows engagement
      if (category === 'genuine') {
        reason = 'Shows thoughtful engagement';
      }
    }

    // Time spent analysis (if available)
    if (timeSpent > 0) {
      if (timeSpent < 1000) { // Less than 1 second
        score -= 15;
        if (category === 'genuine') {
          category = 'low-effort';
          reason = 'Response too quick';
        }
      } else if (timeSpent > 3000 && timeSpent < 30000) { // 3-30 seconds
        score += 10; // Good thinking time
      }
    }

    // Capitalization and punctuation (basic quality indicators)
    const hasCapitalization = /[A-Z]/.test(response);
    const hasPunctuation = /[.!?]/.test(response);
    
    if (hasCapitalization && response.length > 5) {
      score += 5;
    }
    if (hasPunctuation && response.length > 10) {
      score += 5;
    }

    // Ensure score stays within bounds
    score = Math.max(0, Math.min(100, score));

    // Determine final category based on score
    if (score < 20) {
      category = 'spam';
    } else if (score < 40) {
      category = 'gibberish';
    } else if (score < 60) {
      category = 'low-effort';
    } else {
      category = 'genuine';
    }

    // Calculate delay based on category and score
    const delay = this.calculateDelay(category, score);

    return {
      score,
      category,
      delay,
      reason
    };
  }

  private static calculateDelay(category: ResponseQuality['category'], score: number): number {
    const baseDelays = {
      genuine: { min: 2000, max: 5000 },
      'low-effort': { min: 10000, max: 30000 },
      gibberish: { min: 60000, max: 180000 },
      spam: { min: 120000, max: 300000 }
    };

    const range = baseDelays[category];
    
    // Higher score = shorter delay within the category range
    const normalizedScore = Math.max(0, Math.min(100, score));
    const delayFactor = (100 - normalizedScore) / 100;
    
    const delay = range.min + (range.max - range.min) * delayFactor;
    
    return Math.round(delay);
  }

  static getDelayDescription(delay: number): string {
    const seconds = delay / 1000;
    
    if (seconds < 10) {
      return `${seconds}s - Quick transition`;
    } else if (seconds < 60) {
      return `${seconds}s - Standard delay`;
    } else if (seconds < 180) {
      return `${Math.round(seconds / 60)}m - Extended delay`;
    } else {
      return `${Math.round(seconds / 60)}m - Maximum delay`;
    }
  }

  static getRecommendations(quality: ResponseQuality): string[] {
    const recommendations: string[] = [];
    
    switch (quality.category) {
      case 'spam':
        recommendations.push('Consider blocking or limiting this user');
        recommendations.push('Implement CAPTCHA verification');
        recommendations.push('Review spam detection patterns');
        break;
      case 'gibberish':
        recommendations.push('Provide clearer question context');
        recommendations.push('Add input validation');
        recommendations.push('Consider showing examples');
        break;
      case 'low-effort':
        recommendations.push('Encourage more detailed responses');
        recommendations.push('Provide response examples');
        recommendations.push('Add character count indicators');
        break;
      case 'genuine':
        recommendations.push('Great response quality!');
        recommendations.push('Consider faster question transitions');
        recommendations.push('User is engaged and thoughtful');
        break;
    }
    
    return recommendations;
  }
}
