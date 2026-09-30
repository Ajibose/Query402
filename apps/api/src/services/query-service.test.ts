import { QueryService } from './query-service';
import { GroqClient } from '../lib/groq';
import { validateUrlSafety } from '../lib/urlSafety';
import { verifyPayment } from '../lib/x402';

// Mock dependencies
jest.mock('../lib/groq');
jest.mock('../lib/urlSafety');
jest.mock('../lib/x402');

const mockGroqClient = new GroqClient() as jest.Mocked<GroqClient>;
const mockValidateUrlSafety = validateUrlSafety as jest.MockedFunction<typeof validateUrlSafety>;
const mockVerifyPayment = verifyPayment as jest.MockedFunction<typeof verifyPayment>;

describe('QueryService', () => {
  let service: QueryService;

  beforeEach(() => {
    service = new QueryService(mockGroqClient);
    jest.clearAllMocks();
  });

  describe('processQuery', () => {
    const baseRequest = {
      query: 'test query',
      targetUrls: ['https://safe-url.com'],
      model: 'llama-3.1-70b',
      paymentProof: 'valid-proof'
    };

    it('calls the model once for paid, safe requests', async () => {
      mockVerifyPayment.mockResolvedValue(true);
      mockValidateUrlSafety.mockResolvedValue({ isSafe: true });
      mockGroqClient.callModel.mockResolvedValue('model response');

      const result = await service.processQuery(baseRequest);

      expect(mockVerifyPayment).toHaveBeenCalledWith('valid-proof');
      expect(mockValidateUrlSafety).toHaveBeenCalledWith('https://safe-url.com');
      expect(mockGroqClient.callModel).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ result: 'model response', status: 'success' });
    });

    it('does not call the model for failed payment', async () => {
      mockVerifyPayment.mockResolvedValue(false);

      await expect(service.processQuery(baseRequest)).rejects.toThrow('Invalid payment proof');

      expect(mockGroqClient.callModel).not.toHaveBeenCalled();
      expect(mockValidateUrlSafety).not.toHaveBeenCalled();
    });

    it('does not call the model for unsafe URLs', async () => {
      mockVerifyPayment.mockResolvedValue(true);
      mockValidateUrlSafety.mockResolvedValue({ isSafe: false });

      await expect(service.processQuery(baseRequest)).rejects.toThrow('One or more URLs failed safety checks');

      expect(mockGroqClient.callModel).not.toHaveBeenCalled();
    });

    it('handles multiple URLs with mixed safety', async () => {
      mockVerifyPayment.mockResolvedValue(true);
      mockValidateUrlSafety
        .mockResolvedValueOnce({ isSafe: true })
        .mockResolvedValueOnce({ isSafe: false });

      await expect(service.processQuery({
        ...baseRequest,
        targetUrls: ['https://safe-url.com', 'https://unsafe-url.com']
      })).rejects.toThrow('One or more URLs failed safety checks');

      expect(mockGroqClient.callModel).not.toHaveBeenCalled();
    });
  });
});