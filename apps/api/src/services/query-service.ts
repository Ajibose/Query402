import { GroqClient } from '../lib/groq';
import { validateUrlSafety } from '../lib/urlSafety';
import { verifyPayment } from '../lib/x402';
import type { QueryRequest, QueryResponse } from '../types';

export class QueryService {
  private groqClient: GroqClient;

  constructor(groqClient: GroqClient) {
    this.groqClient = groqClient;
  }

  async processQuery(request: QueryRequest): Promise<QueryResponse> {
    // Validate payment first
    const paymentValid = await verifyPayment(request.paymentProof);
    if (!paymentValid) {
      throw new Error('Invalid payment proof');
    }

    // Check URL safety for all targets
    const safetyResults = await Promise.all(
      request.targetUrls.map(url => validateUrlSafety(url))
    );

    const unsafeUrls = safetyResults.filter(result => !result.isSafe);
    if (unsafeUrls.length > 0) {
      throw new Error('One or more URLs failed safety checks');
    }

    // Only call Groq after both gates pass
    const modelResponse = await this.groqClient.callModel({
      prompt: this.buildPrompt(request),
      model: request.model
    });

    return {
      result: modelResponse,
      status: 'success'
    };
  }

  private buildPrompt(request: QueryRequest): string {
    // Build prompt without including payment header or raw URLs
    return `Process query for: ${request.query}. Targets: ${request.targetUrls.length} validated URLs.`;
  }
}