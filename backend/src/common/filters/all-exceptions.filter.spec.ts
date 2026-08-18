import { HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let response: { status: jest.Mock; json: jest.Mock };
  let request: { url: string };

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    response = { status: statusMock, json: jsonMock };
    request = { url: '/test' };
  });

  const createHost = () => ({
    switchToHttp: jest.fn().mockReturnValue({
      getResponse: jest.fn().mockReturnValue(response),
      getRequest: jest.fn().mockReturnValue(request),
    }),
  });

  it('handles HttpException with string response', () => {
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    filter.catch(exception, createHost() as never);
    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: 'Forbidden',
        path: '/test',
      }),
    );
  });

  it('handles HttpException with object response', () => {
    const exception = new HttpException(
      { message: ['field required'], error: 'Bad Request' },
      HttpStatus.BAD_REQUEST,
    );
    filter.catch(exception, createHost() as never);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: ['field required'],
        error: 'Bad Request',
      }),
    );
  });

  it('handles plain Error with 500 status', () => {
    const exception = new Error('Something broke');
    filter.catch(exception, createHost() as never);
    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Something broke',
        error: 'Error',
      }),
    );
  });

  it('handles non-Error exception (string)', () => {
    filter.catch('string error', createHost() as never);
    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
      }),
    );
  });

  it('handles null exception', () => {
    filter.catch(null, createHost() as never);
    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 }),
    );
  });

  it('includes timestamp in ISO format', () => {
    filter.catch(new Error('test'), createHost() as never);
    const body = jsonMock.mock.calls[0][0];
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
